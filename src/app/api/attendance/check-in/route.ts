import { adaptRoute } from '@/lib/adaptRoute';
import { checkIn } from '@/controllers/attendance.controller';
import { authMiddleware } from '@/middlewares/auth.middleware';

export const POST = adaptRoute(checkIn, { middlewares: [authMiddleware] });
