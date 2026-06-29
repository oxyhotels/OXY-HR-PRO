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
  const col = db.collection('propertyreports');

  console.log('Fetching index 1 metadata (excluding files and auditLogs)...');
  const start = Date.now();
  try {
    const doc = await col.find({})
      .sort({ _id: 1 })
      .skip(1)
      .limit(1)
      .project({
        files: 0,
        auditLogs: 0
      })
      .next();
      
    if (doc) {
      console.log(`✓ Success (${Date.now() - start} ms)`);
      console.log('Document keys:', Object.keys(doc));
      console.log('Report info:', {
        _id: doc._id,
        hotelName: doc.hotelName,
        employeeName: doc.employeeName,
        category: doc.category,
        reportDate: doc.reportDate
      });
    } else {
      console.log('❌ No document found.');
    }
  } catch (e: any) {
    console.error(`❌ Failed: ${e.message}`);
  }

  await client.close();
}

check().catch(console.error);
