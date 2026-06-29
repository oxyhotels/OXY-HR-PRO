import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env') });

const MONGODB_URI = process.env.MONGODB_URI;

const getDirectUri = () => {
  const urlParams = new URL(MONGODB_URI as string);
  const username = urlParams.username;
  const password = urlParams.password;
  return `mongodb://${username}:${password}@ac-unqrydo-shard-00-01.r0m4otq.mongodb.net:27017/oxyhr?ssl=true&authSource=admin&retryWrites=true&w=majority&directConnection=true`;
};

async function check() {
  const uri = getDirectUri();
  const client = await mongoose.mongo.MongoClient.connect(uri);
  
  const testDb = client.db('test');
  const oxyhrDb = client.db('oxyhr');
  
  console.log('Clearing target oxyhr.propertyreports...');
  await oxyhrDb.collection('propertyreports').deleteMany({});

  console.log('Copying propertyreports from test to oxyhr via server-side $merge...');
  const start = Date.now();
  
  await testDb.collection('propertyreports').aggregate([
    { $merge: { into: { db: 'oxyhr', coll: 'propertyreports' }, whenMatched: 'replace', whenNotMatched: 'insert' } }
  ]).toArray();
  
  const elapsed = Date.now() - start;
  console.log(`✓ Success! Merged in ${elapsed} ms.`);
  
  const count = await oxyhrDb.collection('propertyreports').countDocuments();
  console.log(`Target document count: ${count}`);

  await client.close();
}

check().catch(console.error);
