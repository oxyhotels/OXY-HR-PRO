import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env') });

const MONGODB_URI = process.env.MONGODB_URI;

const getDirectUri = (host: string) => {
  const urlParams = new URL(MONGODB_URI as string);
  const username = urlParams.username;
  const password = urlParams.password;
  return `mongodb://${username}:${password}@${host}/oxyhr?ssl=true&authSource=admin&retryWrites=true&w=majority&directConnection=true`;
};

const hosts = [
  'ac-unqrydo-shard-00-00.r0m4otq.mongodb.net:27017',
  'ac-unqrydo-shard-00-01.r0m4otq.mongodb.net:27017',
  'ac-unqrydo-shard-00-02.r0m4otq.mongodb.net:27017'
];

async function check() {
  for (const host of hosts) {
    const uri = getDirectUri(host);
    try {
      const client = await mongoose.mongo.MongoClient.connect(uri, { serverSelectionTimeoutMS: 3000 });
      const db = client.db('admin');
      const isMasterResult = await db.command({ isMaster: 1 });
      
      console.log(`Host: ${host}`);
      console.log(`  isMaster (Primary): ${isMasterResult.ismaster || isMasterResult.isWritablePrimary}`);
      console.log(`  ReadOnly Secondary: ${isMasterResult.secondary || false}`);
      
      await client.close();
    } catch (e: any) {
      console.error(`Host: ${host} - Error: ${e.message}`);
    }
  }
}

check().catch(console.error);
