import { adaptRoute } from '@/lib/adaptRoute';
import { approveOvertime } from '@/controllers/attendance.controller';
import { authMiddleware } from '@/middlewares/auth.middleware';

export const POST = adaptRoute(approveOvertime, { middlewares: [authMiddleware] });
