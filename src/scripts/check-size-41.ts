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
  const db = client.db('test');
  const col = db.collection('attendances');

  console.log('Fetching target document...');
  const doc = await col.findOne({ _id: new mongoose.Types.ObjectId('6a33772186b08c9081c088f7') });
  
  if (doc) {
    console.log('Found document.');
    for (const key of Object.keys(doc)) {
      const val = doc[key];
      const size = val ? JSON.stringify(val).length : 0;
      console.log(`  Field: ${key} - Size: ${size} chars`);
    }
  } else {
    console.log('Document not found.');
  }

  await client.close();
}

check().catch(console.error);
