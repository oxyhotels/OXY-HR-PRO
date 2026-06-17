import { adaptRoute } from '@/lib/adaptRoute';
import { getActiveSessions } from '@/controllers/tracking.controller';
import { authMiddleware } from '@/middlewares/auth.middleware';

export const GET = adaptRoute(getActiveSessions, { middlewares: [authMiddleware] });