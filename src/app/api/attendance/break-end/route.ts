import { adaptRoute } from '@/lib/adaptRoute';
import { endBreak } from '@/controllers/attendance.controller';
import { authMiddleware } from '@/middlewares/auth.middleware';

export const POST = adaptRoute(endBreak, { middlewares: [authMiddleware] });
