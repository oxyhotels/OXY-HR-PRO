import { adaptRoute } from '@/lib/adaptRoute';
import { createHandover, getHandovers } from '@/controllers/intelligentOps.controller';
import { authMiddleware } from '@/middlewares/auth.middleware';

export const POST = adaptRoute(createHandover, {
  middlewares: [authMiddleware]
});

export const GET = adaptRoute(getHandovers, {
  middlewares: [authMiddleware]
});
