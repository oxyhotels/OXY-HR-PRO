import { adaptRoute } from '@/lib/adaptRoute';
import { getLeaderboard } from '@/controllers/performance.controller';
import { authMiddleware } from '@/middlewares/auth.middleware';

export const GET = adaptRoute(getLeaderboard, { middlewares: [authMiddleware] });
