import { adaptRoute } from '@/lib/adaptRoute';
import { getGamificationProfile } from '@/controllers/gamification.controller';
import { authMiddleware } from '@/middlewares/auth.middleware';

export const GET = adaptRoute(getGamificationProfile, { middlewares: [authMiddleware] });
