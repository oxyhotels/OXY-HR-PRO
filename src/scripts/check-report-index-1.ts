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
  console.log('Connecting directly...');
  const client = await mongoose.mongo.MongoClient.connect(uri, { serverSelectionTimeoutMS: 5000 });
  const db = client.db('test');
  const col = db.collection('propertyreports');

  console.log('Fetching index 1 of propertyreports...');
  const start = Date.now();
  try {
    const doc = await col.find({}).sort({ _id: 1 }).skip(1).limit(1).next();
    if (doc) {
      const size = JSON.stringify(doc).length;
      console.log(`✓ Success (${Date.now() - start} ms) - _id=${doc._id}, size=${size} chars`);
    } else {
      console.log('❌ No document found.');
    }
  } catch (e: any) {
    console.error(`❌ Failed: ${e.message}`);
  }

  await client.close();
}

check().catch(console.error);
