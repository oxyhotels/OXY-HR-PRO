import { adaptRoute } from '@/lib/adaptRoute';
import { getMyGamificationProfile } from '@/controllers/gamification.controller';
import { authMiddleware } from '@/middlewares/auth.middleware';

export const GET = adaptRoute(getMyGamificationProfile, { middlewares: [authMiddleware] });
