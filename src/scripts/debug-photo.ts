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

  console.log('1. Trying to fetch document #41 EXCLUDING photo fields...');
  try {
    const doc = await col.find({})
      .sort({ _id: 1 })
      .skip(40)
      .limit(1)
      .project({
        checkInPhoto: 0,
        checkOutPhoto: 0,
        checkInSelfie: 0,
        checkOutSelfie: 0,
        workPictureUrl: 0,
        workVideoUrl: 0
      })
      .next();
      
    if (doc) {
      console.log('  ✓ Success! Document keys:', Object.keys(doc));
      console.log('  ✓ Date:', doc.date, 'Employee:', doc.employee);
    } else {
      console.log('  ❌ No document found.');
    }
  } catch (e: any) {
    console.error('  ❌ Failed with projection:', e.message);
  }

  console.log('\n2. Trying to fetch document #41 WITH photo fields (only checking sizes)...');
  try {
    const docFull = await col.find({}).sort({ _id: 1 }).skip(40).limit(1).next();
    if (docFull) {
      console.log('  ✓ Success fetching full doc!');
      console.log('  ✓ checkInPhoto length:', docFull.checkInPhoto?.length || 0);
      console.log('  ✓ checkInSelfie length:', docFull.checkInSelfie?.length || 0);
    }
  } catch (e: any) {
    console.error('  ❌ Failed full fetch:', e.message);
  }

  await client.close();
}

check().catch(console.error);
