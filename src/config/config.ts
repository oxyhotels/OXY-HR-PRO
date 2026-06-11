import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env') });

// Validate required environment variables
const isProduction = process.env.NODE_ENV === 'production' || !!process.env.VERCEL;
const requiredEnvVars = ['MONGODB_URI', 'JWT_SECRET'];
const missingEnvVars = requiredEnvVars.filter((envVar) => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  if (isProduction || !process.env.MONGODB_URI) {
    throw new Error(
      `\n================================================================\n` +
      `[CRITICAL CONFIG ERROR] Missing required environment variables:\n` +
      `  ${missingEnvVars.join(', ')}\n` +
      `Please define these in your environment configuration or .env file.\n` +
      `================================================================\n`
    );
  }
}

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '5000', 10),
  mongoose: {
    url: process.env.MONGODB_URI || 'mongodb://localhost:27017/oxy-hr-pro',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'oxy-hr-super-secret-jwt-key',
    accessExpirationMinutes: parseInt(process.env.JWT_ACCESS_EXPIRATION_MINUTES || '15', 10),
    refreshExpirationDays: parseInt(process.env.JWT_REFRESH_EXPIRATION_DAYS || '7', 10),
  },
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  },
};
