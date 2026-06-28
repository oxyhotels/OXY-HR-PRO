import { dbConnect } from './src/lib/db';
import { User } from './src/models/User';
import { NotificationActivity } from './src/models/NotificationActivity';
import mongoose from 'mongoose';

async function run() {
  await dbConnect();
  const rootAdmin = await User.findOne({ role: 'ROOT_ADMIN' });
  
  if (!rootAdmin) {
    console.log('No Root Admin found');
    process.exit(1);
  }

  const modules = ['Tasks', 'My Tasks', 'Community', 'Attendance', 'Employees', 'Payroll', 'Leaves'];
  
  for (const mod of modules) {
    await NotificationActivity.findOneAndUpdate(
      { userId: rootAdmin._id, module: mod },
      { $set: { count: Math.floor(Math.random() * 10) + 1, updatedAt: new Date() } },
      { upsert: true }
    );
  }
  
  console.log(`Successfully injected test badges for user ${rootAdmin.firstName} ${rootAdmin.lastName}`);
  process.exit(0);
}

run();
