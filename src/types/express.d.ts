import { Schema } from 'mongoose';
import { IUser } from '@/models/User';

declare global {
  namespace Express {
    interface Request {
      user?: IUser;
      tenantId?: string | Schema.Types.ObjectId;
    }
  }
}
