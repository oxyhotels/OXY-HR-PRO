import { adaptRoute } from '@/lib/adaptRoute';
import { getGamificationLeaderboard } from '@/controllers/gamification.controller';
import { authMiddleware } from '@/middlewares/auth.middleware';

export const GET = adaptRoute(getGamificationLeaderboard, { middlewares: [authMiddleware] });
