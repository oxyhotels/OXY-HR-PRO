import { adaptRoute } from '@/lib/adaptRoute';
import { rejectOvertime } from '@/controllers/attendance.controller';
import { authMiddleware } from '@/middlewares/auth.middleware';

export const POST = adaptRoute(rejectOvertime, { middlewares: [authMiddleware] });
