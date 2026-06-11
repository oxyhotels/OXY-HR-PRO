import { adaptRoute } from '@/lib/adaptRoute';
import { updateIncident } from '@/controllers/intelligentOps.controller';
import { authMiddleware } from '@/middlewares/auth.middleware';

export const PUT = adaptRoute(updateIncident, {
  middlewares: [authMiddleware]
});
