import { connectDB } from '../config/db';
import { User } from '../models/User';

async function check() {
  try {
    await connectDB();
    const user = await User.findOne({ email: 'oxy8626@gmail.com' });
    console.log('USER EMAIL:', user?.email);
    console.log('USER ROLE:', user?.role);
  } catch (err) {
    console.error(err);
  }
  process.exit(0);
}
check();
