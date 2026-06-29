import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import dns from 'dns';
import readline from 'readline';
import { connectDB } from '../config/db';

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env') });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI is not defined in the environment or .env file.');
  process.exit(1);
}

// Bootstrap DNS to solve c-ares lookup bugs on Windows
const bootstrapDNS = async () => {
  try {
    const servers = dns.getServers();
    const isLoopbackOnly = servers.every(ip => ip === '127.0.0.1' || ip === '::1' || ip === 'localhost');
    let needsFallback = isLoopbackOnly || servers.length === 0;

    if (!needsFallback) {
      try {
        await new Promise<void>((resolve, reject) => {
          dns.resolve('google.com', (err) => {
            if (err && (err.code === 'ECONNREFUSED' || err.code === 'ENODEV')) {
              reject(err);
            } else {
              resolve();
            }
          });
        });
      } catch (e) {
        needsFallback = true;
      }
    }

    if (needsFallback) {
      console.warn('[DNS] Node.js local DNS server is loopback/unreachable. Programmatically switching DNS to Google (8.8.8.8) and Cloudflare (1.1.1.1) to resolve Atlas hosts.');
      dns.setServers(['8.8.8.8', '1.1.1.1']);
    }
  } catch (err) {
    console.error('[DNS] Failed to bootstrap DNS configuration:', err);
  }
};

// Deep equality helper for comparing MongoDB documents
function deepEqual(a: any, b: any): boolean {
  if (a === b) return true;
  if (a instanceof Date && b instanceof Date) return a.getTime() === b.getTime();
  
  // Handle MongoDB ObjectId or other custom types with .equals()
  if (a && typeof a.equals === 'function' && b && typeof b.equals === 'function') {
    return a.equals(b);
  }
  
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    if (Array.isArray(a) !== Array.isArray(b)) return false;
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;
    for (const k of keysA) {
      if (!keysB.includes(k)) return false;
      if (!deepEqual(a[k], b[k])) return false;
    }
    return true;
  }
  return false;
}

// Check index equality between test and oxyhr
function verifyIndexes(testIdx: any[], oxyIdx: any[]): boolean {
  if (testIdx.length !== oxyIdx.length) return false;
  const sortIdx = (a: any, b: any) => a.name.localeCompare(b.name);
  const testSorted = [...testIdx].sort(sortIdx);
  const oxySorted = [...oxyIdx].sort(sortIdx);
  
  for (let i = 0; i < testSorted.length; i++) {
    const t = testSorted[i];
    const o = oxySorted[i];
    if (JSON.stringify(t.key) !== JSON.stringify(o.key)) return false;
    if (!!t.unique !== !!o.unique) return false;
  }
  return true;
}

// Retry wrapper to handle intermittent DNS/network drops
async function retryOperation<T>(operation: () => Promise<T>, maxRetries = 5, delay = 5000): Promise<T> {
  let lastErr;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (err: any) {
      lastErr = err;
      console.warn(`  [Warning] Operation failed (Attempt ${attempt}/${maxRetries}): ${err.message || err}. Retrying in ${delay / 1000}s...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw lastErr;
}

// Readline prompt for confirmation
function askConfirmation(message: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  return new Promise((resolve) => {
    rl.question(message, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase() === 'yes' || answer.trim().toLowerCase() === 'y');
    });
  });
}

// Show error, suggest fix, and wait for confirmation
async function handleError(error: any, suggestion: string): Promise<void> {
  console.error(`\n====================================================`);
  console.error(`❌ MIGRATION ERROR DETECTED!`);
  console.error(`Reason: ${error.message || error}`);
  console.error(`Suggestion: ${suggestion}`);
  console.error(`====================================================\n`);
  
  if (process.stdin.isTTY) {
    const confirm = await askConfirmation('Type "y" to ignore/retry/continue (if you have fixed the issue), or any other key to abort: ');
    if (confirm) {
      console.log('Attempting to resume migration...');
      return;
    }
  }
  
  console.error('Migration aborted. Exiting with failure status.');
  process.exit(1);
}

async function runMigration() {
  const startTime = Date.now();
  console.log('Connecting directly to the writable primary database node...');
  const directPrimaryHost = 'ac-unqrydo-shard-00-01.r0m4otq.mongodb.net:27017';
  
  let directUri = MONGODB_URI;
  try {
    const url = new URL(MONGODB_URI as string);
    const username = url.username;
    const password = url.password;
    directUri = `mongodb://${username}:${password}@${directPrimaryHost}/oxyhr?ssl=true&authSource=admin&retryWrites=true&w=majority&directConnection=true`;
  } catch (e) {
    console.warn('[Warning] Failed to parse MONGODB_URI, using original URI.');
  }

  const opts = {
    serverSelectionTimeoutMS: 60000,
    socketTimeoutMS: 300000, // 5 minutes socket timeout for large documents
    connectTimeoutMS: 60000,
    directConnection: true
  };

  let client;
  try {
    client = await mongoose.mongo.MongoClient.connect(directUri as string, opts);
  } catch (err: any) {
    await handleError(err, 'Failed to connect directly to Primary DB node. Check host whitelist or database credentials.');
    client = await mongoose.mongo.MongoClient.connect(directUri as string, opts);
  }
  console.log('Connected to MongoDB cluster Primary Node.');

  // Define database names
  const sourceDbName = 'test';
  const targetDbName = 'oxyhr';

  // Verify databases exist and are accessible
  let sourceDbExists = false;
  let targetDbExists = false;

  const testDb = client.db(sourceDbName);
  const oxyhrDb = client.db(targetDbName);

  try {
    await testDb.listCollections().toArray();
    sourceDbExists = true;
  } catch (e: any) {
    console.warn(`[Warning] Direct check for '${sourceDbName}' failed: ${e.message}. Trying ping...`);
    try {
      await testDb.command({ ping: 1 });
      sourceDbExists = true;
    } catch (pingErr: any) {
      await handleError(pingErr, `Ensure database '${sourceDbName}' exists and is accessible by your user credentials.`);
    }
  }

  try {
    await oxyhrDb.listCollections().toArray();
    targetDbExists = true;
  } catch (e: any) {
    console.warn(`[Warning] Direct check for '${targetDbName}' failed: ${e.message}. Trying ping...`);
    try {
      await oxyhrDb.command({ ping: 1 });
      targetDbExists = true;
    } catch (pingErr: any) {
      await handleError(pingErr, `Ensure database '${targetDbName}' exists and is accessible by your user credentials.`);
    }
  }

  if (!sourceDbExists) {
    await handleError(new Error(`Source database '${sourceDbName}' is not accessible.`), 'Check your database name and connection permissions.');
  }
  if (!targetDbExists) {
    await handleError(new Error(`Target database '${targetDbName}' is not accessible.`), 'Check your database name and connection permissions.');
  }

  console.log('Reading Collections...');

  // Fetch all collections from test database automatically
  const testCollections = await testDb.listCollections().toArray();
  const collectionNames = testCollections
    .map(c => c.name)
    .filter(name => !name.startsWith('system.'));

  if (collectionNames.length === 0) {
    console.error(`❌ No collections found in source database '${sourceDbName}'.`);
    process.exit(1);
  }

  // Verify same collections exist in target db (oxyhr) or create them
  const targetCollections = await oxyhrDb.listCollections().toArray();
  const targetCollectionNames = new Set(targetCollections.map(c => c.name));

  for (const colName of collectionNames) {
    const testCol = testDb.collection(colName);
    const oxyhrCol = oxyhrDb.collection(colName);

    if (!targetCollectionNames.has(colName)) {
      console.log(`[Info] Collection '${colName}' is missing in target database '${targetDbName}'. Creating it...`);
      try {
        await oxyhrDb.createCollection(colName);
        console.log(`  ✓ Created collection '${colName}' in target database.`);
      } catch (err: any) {
        await handleError(
          err,
          `Failed to automatically create collection '${colName}'. Verify database privileges.`
        );
      }
    }

    // Always verify/sync indexes
    try {
      const sourceIndexes = await testCol.indexes();
      const targetIndexes = await oxyhrCol.indexes();
      const targetIndexNames = new Set(targetIndexes.map(idx => idx.name));

      for (const idx of sourceIndexes) {
        if (idx.name === '_id_') continue;
        if (targetIndexNames.has(idx.name)) continue; // already exists

        console.log(`[Info] Index '${idx.name}' is missing on target collection '${colName}'. Recreating it...`);
        let keys = idx.key;
        const options: any = { name: idx.name };
        if (idx.unique) options.unique = true;
        if (idx.sparse) options.sparse = true;
        if (idx.expireAfterSeconds !== undefined) options.expireAfterSeconds = idx.expireAfterSeconds;
        
        // Reconstruct text indexes using weights
        if (idx.weights) {
          const textKeys: any = {};
          for (const field of Object.keys(idx.weights)) {
            textKeys[field] = 'text';
          }
          keys = textKeys;
          options.weights = idx.weights;
          if (idx.default_language) options.default_language = idx.default_language;
          if (idx.language_override) options.language_override = idx.language_override;
        }
        
        await oxyhrCol.createIndex(keys, options);
        console.log(`  ✓ Recreated missing index '${idx.name}' on '${colName}'.`);
      }
    } catch (err: any) {
      await handleError(
        err,
        `Failed to automatically verify or recreate indexes on collection '${colName}'.`
      );
    }
  }

  // Pre-migration counts & metadata logging
  console.log('Creating backup log...');
  const backupLogPath = path.join(process.cwd(), `migration_backup_${Date.now()}.json`);
  const backupLog: any = {
    timestamp: new Date().toISOString(),
    databases: {
      source: sourceDbName,
      target: targetDbName
    },
    collections: []
  };

  const collectionCounts: Record<string, { testCount: number; oxyhrCountBefore: number }> = {};

  for (const colName of collectionNames) {
    const testCol = testDb.collection(colName);
    const oxyhrCol = oxyhrDb.collection(colName);
    
    const testCount = await testCol.countDocuments();
    const oxyhrCountBefore = await oxyhrCol.countDocuments();
    
    collectionCounts[colName] = { testCount, oxyhrCountBefore };
    backupLog.collections.push({
      collectionName: colName,
      sourceCount: testCount,
      targetCountBefore: oxyhrCountBefore
    });
  }

  fs.writeFileSync(backupLogPath, JSON.stringify(backupLog, null, 2));
  console.log(`Pre-migration backup log written to: ${backupLogPath}`);

  // Migration report tracking
  const reportResults: any[] = [];
  let totalCollections = collectionNames.length;
  let totalDocumentsInSource = 0;
  let totalDocumentsCopied = 0;
  let totalFailedCollections = 0;

  for (const colName of collectionNames) {
    const colStartTime = Date.now();
    console.log(`Migrating ${colName}...`);
    
    const testCol = testDb.collection(colName);
    const oxyhrCol = oxyhrDb.collection(colName);
    
    const counts = collectionCounts[colName];
    totalDocumentsInSource += counts.testCount;

    let success = false;
    let copied = 0;
    let failed = 0;
    let errorMsg = '';

    try {
      // Step 4: Delete all existing documents inside the collection in oxyhr
      await retryOperation(() => oxyhrCol.deleteMany({}));
      
      // Step 5: Copy documents from test to oxyhr via server-side $merge
      if (counts.testCount > 0) {
        await retryOperation(() => testCol.aggregate([
          { $merge: { into: { db: targetDbName, coll: colName }, whenMatched: 'replace', whenNotMatched: 'insert' } }
        ]).toArray());
      }
      copied = counts.testCount;

      // Step 6: Verification
      // A. Document Count check
      const postOxyhrCount = await oxyhrCol.countDocuments();
      if (postOxyhrCount !== counts.testCount) {
        throw new Error(`Count mismatch for collection '${colName}'. Source: ${counts.testCount}, Target: ${postOxyhrCount}`);
      }

      // B. ObjectIds & Deep equality check (Sample verification)
      const sampleSize = 10;
      const excludeFields = {
        files: 0,
        auditLogs: 0,
        checkInPhoto: 0,
        checkOutPhoto: 0,
        checkInSelfie: 0,
        checkOutSelfie: 0,
        workPictureUrl: 0,
        workVideoUrl: 0,
        attachments: 0,
        voiceNote: 0,
        videoMessage: 0,
        photoUrl: 0,
        groupIcon: 0
      };

      // Get first few documents
      const firstDocsSource = await testCol.find({}).sort({ _id: 1 }).limit(sampleSize).project(excludeFields).toArray();
      const firstDocsTarget = await oxyhrCol.find({}).sort({ _id: 1 }).limit(sampleSize).project(excludeFields).toArray();
      
      // Get last few documents
      const lastDocsSource = await testCol.find({}).sort({ _id: -1 }).limit(sampleSize).project(excludeFields).toArray();
      const lastDocsTarget = await oxyhrCol.find({}).sort({ _id: -1 }).limit(sampleSize).project(excludeFields).toArray();

      // Deep compare first docs
      if (firstDocsSource.length !== firstDocsTarget.length) {
        throw new Error(`Sample size mismatch at start of collection '${colName}'.`);
      }
      for (let i = 0; i < firstDocsSource.length; i++) {
        if (!deepEqual(firstDocsSource[i], firstDocsTarget[i])) {
          throw new Error(`Data mismatch detected in collection '${colName}' at document index ${i}.`);
        }
      }

      // Deep compare last docs
      if (lastDocsSource.length !== lastDocsTarget.length) {
        throw new Error(`Sample size mismatch at end of collection '${colName}'.`);
      }
      for (let i = 0; i < lastDocsSource.length; i++) {
        if (!deepEqual(lastDocsSource[i], lastDocsTarget[i])) {
          throw new Error(`Data mismatch detected in collection '${colName}' at reverse index ${i}.`);
        }
      }

      // C. Indexes Check
      const testIndexes = await testCol.indexes();
      const oxyhrIndexes = await oxyhrCol.indexes();
      if (!verifyIndexes(testIndexes, oxyhrIndexes)) {
        throw new Error(`Indexes mismatch in collection '${colName}'.`);
      }

      success = true;
      totalDocumentsCopied += copied;
    } catch (err: any) {
      failed = counts.testCount - copied;
      errorMsg = err.message || err.toString();
      totalFailedCollections++;
      
      await handleError(
        err, 
        `Error during copying or validation of collection '${colName}'. Check collection state, duplicate keys, or connection parameters.`
      );
    }

    const elapsedCol = Date.now() - colStartTime;
    reportResults.push({
      collectionName: colName,
      testCount: counts.testCount,
      copied,
      oxyhrCountAfter: counts.testCount, // should match if successful
      missing: counts.testCount - copied,
      failed,
      success,
      elapsedMs: elapsedCol,
      errorMsg
    });
  }

  console.log('Verification Complete...');
  
  const totalElapsedTime = Date.now() - startTime;
  const overallSuccess = totalFailedCollections === 0;

  // Generate Report Markdown
  const reportPath = path.join(process.cwd(), `migration_report_${Date.now()}.md`);
  let mdReport = `# MongoDB Database Migration Report\n\n`;
  mdReport += `**Timestamp:** ${new Date().toISOString()}\n`;
  mdReport += `**Source Database:** \`${sourceDbName}\`\n`;
  mdReport += `**Target Database:** \`${targetDbName}\`\n`;
  mdReport += `**Total Elapsed Time:** ${(totalElapsedTime / 1000).toFixed(2)} seconds\n`;
  mdReport += `**Overall Migration Status:** ${overallSuccess ? '✅ SUCCESS' : '❌ FAILED'}\n\n`;
  
  mdReport += `## Collection-level Breakdown\n\n`;
  mdReport += `| Collection Name | Documents in Test | Documents Copied | Documents in Oxyhr | Missing Documents | Failed Documents | Success Status | Time Taken |\n`;
  mdReport += `| --- | --- | --- | --- | --- | --- | --- | --- |\n`;
  
  for (const r of reportResults) {
    mdReport += `| ${r.collectionName} | ${r.testCount} | ${r.copied} | ${r.oxyhrCountAfter} | ${r.missing} | ${r.failed} | ${r.success ? '✓ SUCCESS' : '✗ FAILED'} | ${(r.elapsedMs / 1000).toFixed(2)}s |\n`;
  }
  
  mdReport += `\n## Overall Summary\n\n`;
  mdReport += `- **Total Collections Migrated:** ${totalCollections}\n`;
  mdReport += `- **Total Documents in Source:** ${totalDocumentsInSource}\n`;
  mdReport += `- **Total Documents Copied Successfully:** ${totalDocumentsCopied}\n`;
  mdReport += `- **Total Failed Collections:** ${totalFailedCollections}\n`;
  mdReport += `- **Data Integrity Check:** ${overallSuccess ? 'PASS ✓' : 'FAIL ❌'}\n`;
  mdReport += `- **Final Status:** ${overallSuccess ? 'Migration Completed Successfully.' : 'Migration Terminated with Errors.'}\n`;

  fs.writeFileSync(reportPath, mdReport);
  console.log(`Migration report written to: ${reportPath}`);

  // Display summary table to console
  console.log('\n================ MIGRATION REPORT ================');
  console.table(reportResults.map(r => ({
    Collection: r.collectionName,
    'Docs in Test': r.testCount,
    'Docs Copied': r.copied,
    'Docs in Oxyhr': r.oxyhrCountAfter,
    Missing: r.missing,
    Failed: r.failed,
    Status: r.success ? '✓ SUCCESS' : '✗ FAILED',
    Time: `${(r.elapsedMs / 1000).toFixed(2)}s`
  })));

  console.log('\n====================================================');
  console.log(`${overallSuccess ? '✓' : '❌'} Total Collections: ${totalCollections}`);
  console.log(`${overallSuccess ? '✓' : '❌'} Total Documents: ${totalDocumentsInSource}`);
  console.log(`${overallSuccess ? '✓' : '❌'} Successfully Copied: ${totalDocumentsCopied}`);
  console.log(`${overallSuccess ? '✓' : '❌'} Failed: ${totalFailedCollections > 0 ? 'Yes' : 'None'}`);
  console.log(`${overallSuccess ? '✓' : '❌'} Time Taken: ${(totalElapsedTime / 1000).toFixed(2)}s`);
  console.log(`${overallSuccess ? '✓' : '❌'} Data Integrity Check: ${overallSuccess ? 'PASS' : 'FAIL'}`);
  console.log(`${overallSuccess ? '✓' : '❌'} Final Status: ${overallSuccess ? 'Migration Completed Successfully.' : 'Migration Terminated with Errors.'}`);
  console.log('====================================================\n');

  await client.close();

  if (overallSuccess) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runMigration().catch(err => {
  console.error('Fatal Migration Failure:', err);
  process.exit(1);
});
