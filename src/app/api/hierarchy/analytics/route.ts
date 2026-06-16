import { adaptRoute } from '@/lib/adaptRoute';
import { getAnalytics } from '@/controllers/hierarchy.controller';
import { authMiddleware } from '@/middlewares/auth.middleware';

const middlewares = [authMiddleware];

export const GET = adaptRoute(getAnalytics, { middlewares });
