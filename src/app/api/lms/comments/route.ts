import { adaptRoute } from '@/lib/adaptRoute';
import { createComment, getComments } from '@/controllers/lms.controller';
import { authMiddleware } from '@/middlewares/auth.middleware';

export const POST = adaptRoute(createComment, {
  middlewares: [authMiddleware]
});

export const GET = adaptRoute(getComments, {
  middlewares: [authMiddleware]
});
