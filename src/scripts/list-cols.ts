import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env') });

async function check() {
  const client = await mongoose.mongo.MongoClient.connect(process.env.MONGODB_URI as string);
  const testDb = client.db('test');
  const oxyhrDb = client.db('oxyhr');

  const testCols = (await testDb.listCollections().toArray()).map(c => c.name).sort();
  const oxyhrCols = (await oxyhrDb.listCollections().toArray()).map(c => c.name).sort();

  console.log('--- TEST COLLECTIONS ---');
  console.log(testCols);
  
  console.log('\n--- OXYHR COLLECTIONS ---');
  console.log(oxyhrCols);

  await client.close();
}

check();
