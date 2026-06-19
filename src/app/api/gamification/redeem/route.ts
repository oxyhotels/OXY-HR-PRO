import { adaptRoute } from '@/lib/adaptRoute';
import { redeemReward } from '@/controllers/gamification.controller';
import { authMiddleware } from '@/middlewares/auth.middleware';

export const POST = adaptRoute(redeemReward, { middlewares: [authMiddleware] });
