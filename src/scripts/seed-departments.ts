import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables before importing models
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { Department } from '../models/Department';
import { config } from '../config/config';

const DEFAULT_DEPARTMENTS = [
  'Central Team',
  'Sales Office Team',
  'Property Team',
  'IT Team',
  'Other',
];

async function runSeed() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(config.mongoose.url);
    console.log('Connected.');

    console.log('Deleting existing departments...');
    await Department.deleteMany({});
    
    console.log('Inserting default departments...');
    for (const name of DEFAULT_DEPARTMENTS) {
      await Department.create({
        name,
        isDefault: true,
        isActive: true,
        code: name.replace(/[^A-Za-z0-9]/g, '').substring(0, 4).toUpperCase(),
        status: 'Active',
      });
      console.log(`Created: ${name}`);
    }

    console.log('Departments seeded successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Error seeding departments:', err);
    process.exit(1);
  }
}

runSeed();
