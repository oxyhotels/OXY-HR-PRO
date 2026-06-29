import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { connectDB } from '../config/db';

dotenv.config({ path: path.join(process.cwd(), '.env') });

const MONGODB_URI = process.env.MONGODB_URI;

const getDirectUri = () => {
  const urlParams = new URL(MONGODB_URI as string);
  const username = urlParams.username;
  const password = urlParams.password;
  return `mongodb://${username}:${password}@ac-unqrydo-shard-00-01.r0m4otq.mongodb.net:27017/oxyhr?ssl=true&authSource=admin&retryWrites=true&w=majority&directConnection=true`;
};

async function check() {
  console.log('Connecting directly...');
  const uri = getDirectUri();
  const client = await mongoose.mongo.MongoClient.connect(uri, { serverSelectionTimeoutMS: 5000 });
  console.log('Connected.');
  
  const db = client.db('test');
  const col = db.collection('attendances');
  
  console.log('Counting docs...');
  const count = await col.countDocuments();
  console.log(`Docs count: ${count}`);

  console.log('Fetching documents one-by-one...');
  let lastId = null;
  let fetchedCount = 0;
  
  while (fetchedCount < count) {
    const query: Record<string, any> = lastId ? { _id: { $gt: lastId } } : {};
    const docs = await col.find(query).sort({ _id: 1 }).limit(1).toArray();
    
    if (docs.length === 0) {
      break;
    }
    
    fetchedCount += docs.length;
    if (fetchedCount % 10 === 0 || fetchedCount === count) {
      console.log(`Progress: Fetched ${fetchedCount} / ${count} docs`);
    }
    lastId = docs[docs.length - 1]._id;
  }

  console.log(`Successfully completed! Total fetched: ${fetchedCount}`);
  await client.close();
}

check().catch(console.error);
