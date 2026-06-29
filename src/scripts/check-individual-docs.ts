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
  const client = await mongoose.mongo.MongoClient.connect(uri, { serverSelectionTimeoutMS: 5000 });
  const db = client.db('test');
  const col = db.collection('attendances');

  console.log('Fetching documents 35 to 55 individually...');
  for (let i = 35; i <= 55; i++) {
    const start = Date.now();
    try {
      const doc = await col.find({}).sort({ _id: 1 }).skip(i).limit(1).next();
      if (doc) {
        console.log(`Index ${i}: ✓ Success (${Date.now() - start} ms) - _id=${doc._id}`);
      } else {
        console.log(`Index ${i}: ❌ No document`);
      }
    } catch (e: any) {
      console.error(`Index ${i}: ❌ Failed: ${e.message}`);
    }
  }

  await client.close();
}

check().catch(console.error);
