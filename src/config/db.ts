import mongoose from 'mongoose';
import { config } from '@/config/config';
import dns from 'dns';

// Force DNS lookup to prefer IPv4 globally to prevent [64:ff9b::...] IPv6/NAT64 timeouts
if (typeof dns.setDefaultResultOrder === 'function') {
  dns.setDefaultResultOrder('ipv4first');
}

let MONGODB_URI = config.mongoose.url || process.env.MONGODB_URI || process.env.MONGODB_URL;

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable inside .env');
}

/**
 * Global is used here to maintain a cached connection across hot reloads
 * in development. This prevents connections growing exponentially
 * during API Route usage.
 */
let cached = (global as any).mongoose;

if (!cached) {
  cached = (global as any).mongoose = { conn: null, promise: null };
}

// Dynamically fix Node.js c-ares DNS bugs by falling back to public DNS if loopback/errors occur
const bootstrapDNS = async () => {
  try {
    const servers = dns.getServers();
    const isLoopbackOnly = servers.every(ip => ip === '127.0.0.1' || ip === '::1' || ip === 'localhost');
    let needsFallback = isLoopbackOnly || servers.length === 0;

    if (!needsFallback) {
      // Test if standard DNS queries fail with ECONNREFUSED (typical c-ares bug)
      try {
        await new Promise<void>((resolve, reject) => {
          dns.resolve('google.com', (err) => {
            if (err && (err.code === 'ECONNREFUSED' || err.code === 'ENODEV')) {
              reject(err);
            } else {
              resolve();
            }
          });
        });
      } catch (e) {
        needsFallback = true;
      }
    }

    if (needsFallback) {
      console.warn('[DNS] Node.js local DNS server is loopback/unreachable. Programmatically switching DNS to Google (8.8.8.8) and Cloudflare (1.1.1.1) to resolve Atlas hosts.');
      dns.setServers(['8.8.8.8', '1.1.1.1']);
    }
  } catch (err) {
    console.error('[DNS] Failed to bootstrap DNS configuration:', err);
  }
};

// Generate the standard URI fallback from the SRV URI
const getFallbackUri = (srvUri: string) => {
  // Try to parse credentials from the SRV URI
  const urlParams = new URL(srvUri);
  const username = urlParams.username;
  const password = urlParams.password;
  
  return `mongodb://${username}:${password}@ac-unqrydo-shard-00-00.r0m4otq.mongodb.net:27017,ac-unqrydo-shard-00-01.r0m4otq.mongodb.net:27017,ac-unqrydo-shard-00-02.r0m4otq.mongodb.net:27017/oxyhr?replicaSet=atlas-qsrwyc-shard-0&ssl=true&authSource=admin&retryWrites=true&w=majority`;
};

// Setup connection event listeners
mongoose.connection.on('connected', () => {
  console.log(`\n══════════════════════════════════════`);
  console.log(`MongoDB Connection Status`);
  console.log(`URI Loaded ✔`);
  console.log(`DNS OK ✔`);
  console.log(`Atlas Reachable ✔`);
  console.log(`Connected ✔`);
  console.log(`Database: ${mongoose.connection.name || 'oxyhr'}`);
  console.log(`Cluster: mnt`);
  console.log(`══════════════════════════════════════\n`);
});

mongoose.connection.on('disconnected', () => {
  console.warn('[MongoDB] Disconnected from Atlas Cluster.');
});

mongoose.connection.on('reconnected', () => {
  console.log('[MongoDB] Successfully reconnected to Atlas Cluster.');
});

mongoose.connection.on('error', (err) => {
  console.error(`[MongoDB] Connection error: ${err.message}`);
});

const connectWithRetry = async (retries = 5, delay = 5000): Promise<typeof mongoose> => {
  const opts = {
    serverSelectionTimeoutMS: 30000,
    socketTimeoutMS: 45000,
    maxPoolSize: 20,
    minPoolSize: 5,
    retryWrites: true,
    autoIndex: true,
    family: 4
  };

  let start = Date.now();
  let currentUri = MONGODB_URI as string;

  for (let i = 0; i < retries; i++) {
    try {
      const mongooseInstance = await mongoose.connect(currentUri, opts);
      const latency = Date.now() - start;
      console.log(`Latency: ${latency} ms`); // Append latency to the logs
      return mongooseInstance;
    } catch (error: any) {
      console.log(`\nMongoDB Connection Failed`);
      console.log(`Reason: ${error.message}`);
      console.log(`\nPossible causes:`);
      console.log(`• Atlas paused`);
      console.log(`• Firewall`);
      console.log(`• DNS`);
      console.log(`• VPN`);
      console.log(`• Invalid URI`);
      console.log(`• Replica unavailable`);
      console.log(`\nCurrent Retry: ${i + 1} / ${retries}\n`);
      
      // If we failed with SRV, try fallback for the remaining retries
      if (currentUri.startsWith('mongodb+srv://')) {
        console.log(`[MongoDB] Falling back to standard MongoDB URI...`);
        currentUri = getFallbackUri(MONGODB_URI as string);
      }

      if (i === retries - 1) {
        throw error;
      }
      
      await new Promise(res => setTimeout(res, delay));
      start = Date.now();
    }
  }
  throw new Error('Unreachable connection code');
};

export const connectDB = async (): Promise<any> => {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    cached.promise = (async () => {
      try {
        await bootstrapDNS();
        const mongooseInstance = await connectWithRetry();
        return mongooseInstance;
      } catch (error) {
        cached.promise = null;
        throw error;
      }
    })();
  }
  
  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
};
