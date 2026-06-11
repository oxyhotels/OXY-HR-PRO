import { adaptRoute } from '@/lib/adaptRoute';
import { acceptHandover } from '@/controllers/intelligentOps.controller';
import { authMiddleware } from '@/middlewares/auth.middleware';

export const POST = adaptRoute(acceptHandover, {
  middlewares: [authMiddleware]
});
