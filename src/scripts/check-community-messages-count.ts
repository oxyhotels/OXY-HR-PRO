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
  const db = client.db('oxyhr');
  
  const count = await db.collection('communitymessages').countDocuments();
  console.log(`Current document count in oxyhr.communitymessages: ${count}`);

  const userCount = await db.collection('users').countDocuments();
  console.log(`Current document count in oxyhr.users: ${userCount}`);

  await client.close();
}

check().catch(console.error);
