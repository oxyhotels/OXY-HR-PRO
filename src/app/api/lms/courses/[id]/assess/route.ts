import { adaptRoute } from '@/lib/adaptRoute';
import { submitAssessment } from '@/controllers/lms.controller';
import { authMiddleware } from '@/middlewares/auth.middleware';

export const POST = adaptRoute(submitAssessment, { middlewares: [authMiddleware] });
