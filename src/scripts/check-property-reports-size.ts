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
  const col = db.collection('propertyreports');

  const count = await col.countDocuments();
  console.log(`Documents in test.propertyreports: ${count}`);

  const docs = await col.find({}).toArray();
  for (let i = 0; i < docs.length; i++) {
    const doc = docs[i];
    console.log(`Report ${i}: _id=${doc._id}`);
    if (doc.files && doc.files.length > 0) {
      for (let f = 0; f < doc.files.length; f++) {
        const file = doc.files[f];
        console.log(`  File ${f}: name=${file.fileName}, urlSize=${file.fileUrl ? file.fileUrl.length : 0}`);
      }
    }
  }

  await client.close();
}

check().catch(console.error);
