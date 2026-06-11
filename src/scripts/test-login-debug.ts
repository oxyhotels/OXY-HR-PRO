import { connectDB } from '../config/db';
import { login } from '../controllers/auth.controller';
import { User } from '../models/User';

async function run() {
  await connectDB();
  
  const req: any = {
    body: {
      email: 'oxy8626@gmail.com',
      password: 'OXY@@8626'
    },
    ip: '127.0.0.1'
  };

  let statusCode = 200;
  let responseData: any = null;

  const res: any = {
    status(code: number) {
      statusCode = code;
      return this;
    },
    json(data: any) {
      responseData = data;
      return this;
    },
    cookie(name: string, value: string, options: any) {
      console.log('Set Cookie:', name, value);
      return this;
    }
  };

  const next = (err: any) => {
    console.error('Next called with error:', err);
  };

  try {
    await login(req, res, next);
    console.log('Result Status:', statusCode);
    console.log('Result Data:', responseData);
  } catch (err) {
    console.error('Crash in login:', err);
  }
  
  process.exit(0);
}

run();
