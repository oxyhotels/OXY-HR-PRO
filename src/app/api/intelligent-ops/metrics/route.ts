import { adaptRoute } from '@/lib/adaptRoute';
import { getOpsMetrics } from '@/controllers/intelligentOps.controller';
import { authMiddleware } from '@/middlewares/auth.middleware';

export const GET = adaptRoute(getOpsMetrics, {
  middlewares: [authMiddleware]
});
