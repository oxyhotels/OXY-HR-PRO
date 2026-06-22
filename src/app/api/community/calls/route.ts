import { adaptRoute } from '@/lib/adaptRoute';
import { startCallSession, getActiveCalls } from '@/controllers/community.controller';
import { authMiddleware } from '@/middlewares/auth.middleware';

export const POST = adaptRoute(startCallSession, { middlewares: [authMiddleware] });
export const GET = adaptRoute(getActiveCalls, { middlewares: [authMiddleware] });
