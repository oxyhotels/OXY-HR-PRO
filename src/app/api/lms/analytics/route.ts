import { adaptRoute } from '@/lib/adaptRoute';
import { getLmsAnalytics } from '@/controllers/lms.controller';
import { authMiddleware } from '@/middlewares/auth.middleware';

export const GET = adaptRoute(getLmsAnalytics, {
  middlewares: [authMiddleware]
});
