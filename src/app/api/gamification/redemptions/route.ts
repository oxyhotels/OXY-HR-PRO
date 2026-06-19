import { adaptRoute } from '@/lib/adaptRoute';
import { getRedemptions } from '@/controllers/gamification.controller';
import { authMiddleware } from '@/middlewares/auth.middleware';

export const GET = adaptRoute(getRedemptions, { middlewares: [authMiddleware] });
