import { adaptRoute } from '@/lib/adaptRoute';
import { offlineSync } from '@/controllers/intelligentOps.controller';
import { authMiddleware } from '@/middlewares/auth.middleware';

export const POST = adaptRoute(offlineSync, {
  middlewares: [authMiddleware]
});
