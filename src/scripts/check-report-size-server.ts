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

  console.log('Running server-side aggregation for file sizes...');
  try {
    const result = await col.aggregate([
      { $match: { _id: new mongoose.Types.ObjectId('6a40ad450a369ee2312e57f8') } },
      { $project: {
          fileUrlsSizes: {
            $map: {
              input: "$files",
              as: "file",
              in: {
                name: "$$file.fileName",
                size: { $strLenCP: { $ifNull: ["$$file.fileUrl", ""] } }
              }
            }
          }
        }
      }
    ]).toArray();
    
    console.log('Aggregation result:', JSON.stringify(result, null, 2));
  } catch (e: any) {
    console.error(`❌ Failed: ${e.message}`);
  }

  await client.close();
}

check().catch(console.error);
