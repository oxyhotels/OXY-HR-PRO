import { adaptRoute } from '@/lib/adaptRoute';
import { saveWatchProgress, getWatchProgress } from '@/controllers/lms.controller';
import { authMiddleware } from '@/middlewares/auth.middleware';

export const POST = adaptRoute(saveWatchProgress, {
  middlewares: [authMiddleware]
});

export const GET = adaptRoute(getWatchProgress, {
  middlewares: [authMiddleware]
});
