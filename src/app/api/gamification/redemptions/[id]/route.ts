import { adaptRoute } from '@/lib/adaptRoute';
import { updateRedemptionStatus } from '@/controllers/gamification.controller';
import { authMiddleware } from '@/middlewares/auth.middleware';

export const PATCH = adaptRoute(updateRedemptionStatus, { middlewares: [authMiddleware] });
