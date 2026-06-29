import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env') });

const MONGODB_URI = process.env.MONGODB_URI;

// Extract username, password from MONGODB_URI
const getDirectUri = (host: string) => {
  const urlParams = new URL(MONGODB_URI as string);
  const username = urlParams.username;
  const password = urlParams.password;
  return `mongodb://${username}:${password}@${host}/oxyhr?ssl=true&authSource=admin&retryWrites=true&w=majority&directConnection=true`;
};

const hosts = [
  'ac-unqrydo-shard-00-00.r0m4otq.mongodb.net:27017',
  'ac-unqrydo-shard-00-01.r0m4otq.mongodb.net:27017',
  'ac-unqrydo-shard-00-02.r0m4otq.mongodb.net:27017'
];

async function check() {
  for (const host of hosts) {
    const uri = getDirectUri(host);
    console.log(`\nTesting connection to ${host} directly...`);
    const start = Date.now();
    try {
      const client = await mongoose.mongo.MongoClient.connect(uri, { serverSelectionTimeoutMS: 5000 });
      console.log(`  ✓ Connected successfully to ${host}!`);
      
      const testDb = client.db('test');
      console.log(`  ✓ Fetching count of attendances...`);
      const count = await testDb.collection('attendances').countDocuments();
      console.log(`  ✓ Attendance count: ${count}`);
      
      console.log(`  ✓ Fetching one attendance document...`);
      const doc = await testDb.collection('attendances').findOne();
      console.log(`  ✓ Success! Fetch time: ${Date.now() - start} ms`);
      
      await client.close();
    } catch (e: any) {
      console.error(`  ❌ Failed to connect to ${host}: ${e.message}`);
    }
  }
}

check().catch(console.error);
