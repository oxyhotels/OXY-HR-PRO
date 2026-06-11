import { adaptRoute } from '@/lib/adaptRoute';
import { checkOut } from '@/controllers/attendance.controller';
import { authMiddleware } from '@/middlewares/auth.middleware';

export const POST = adaptRoute(checkOut, { middlewares: [authMiddleware] });
