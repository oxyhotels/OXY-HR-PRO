import { adaptRoute } from '@/lib/adaptRoute';
import { submitAssessment, getCourseAssessment } from '@/controllers/lms.controller';
import { authMiddleware } from '@/middlewares/auth.middleware';

export const POST = adaptRoute(submitAssessment, {
  middlewares: [authMiddleware]
});

export const GET = adaptRoute(getCourseAssessment, {
  middlewares: [authMiddleware]
});
