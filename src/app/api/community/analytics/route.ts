import { adaptRoute } from '@/lib/adaptRoute';
import { getCommunityAnalytics } from '@/controllers/community.controller';
import { authMiddleware } from '@/middlewares/auth.middleware';

export const GET = adaptRoute(getCommunityAnalytics, { middlewares: [authMiddleware] });
