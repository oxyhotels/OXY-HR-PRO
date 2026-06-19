import { adaptRoute } from '@/lib/adaptRoute';
import { getActivityFeed } from '@/controllers/gamification.controller';
import { authMiddleware } from '@/middlewares/auth.middleware';

export const GET = adaptRoute(getActivityFeed, { middlewares: [authMiddleware] });
