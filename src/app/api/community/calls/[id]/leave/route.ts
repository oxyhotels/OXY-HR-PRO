import { adaptRoute } from '@/lib/adaptRoute';
import { leaveCallSession } from '@/controllers/community.controller';
import { authMiddleware } from '@/middlewares/auth.middleware';

export const POST = adaptRoute(leaveCallSession, { middlewares: [authMiddleware] });
