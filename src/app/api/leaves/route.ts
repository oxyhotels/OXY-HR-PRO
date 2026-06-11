import { adaptRoute } from '@/lib/adaptRoute';
import { getLeaves, requestLeave } from '@/controllers/leave.controller';
import { authMiddleware } from '@/middlewares/auth.middleware';

export const GET = adaptRoute(getLeaves, { middlewares: [authMiddleware] });
export const POST = adaptRoute(requestLeave, { middlewares: [authMiddleware] });
