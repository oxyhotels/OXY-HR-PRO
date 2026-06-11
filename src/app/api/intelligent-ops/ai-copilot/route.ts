import { adaptRoute } from '@/lib/adaptRoute';
import { handleAICopilotQuery } from '@/controllers/intelligentOps.controller';
import { authMiddleware } from '@/middlewares/auth.middleware';

export const POST = adaptRoute(handleAICopilotQuery, {
  middlewares: [authMiddleware]
});
