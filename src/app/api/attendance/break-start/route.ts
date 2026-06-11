import { adaptRoute } from '@/lib/adaptRoute';
import { startBreak } from '@/controllers/attendance.controller';
import { authMiddleware } from '@/middlewares/auth.middleware';

export const POST = adaptRoute(startBreak, { middlewares: [authMiddleware] });
