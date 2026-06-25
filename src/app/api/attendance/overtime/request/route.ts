import { adaptRoute } from '@/lib/adaptRoute';
import { requestOvertime } from '@/controllers/attendance.controller';
import { authMiddleware } from '@/middlewares/auth.middleware';

export const POST = adaptRoute(requestOvertime, { middlewares: [authMiddleware] });
