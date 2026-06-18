import { adaptRoute } from '@/lib/adaptRoute';
import { getTaskAnalytics } from '@/controllers/taskWorkflow.controller';
import { authMiddleware } from '@/middlewares/auth.middleware';

export const GET = adaptRoute(getTaskAnalytics, { middlewares: [authMiddleware] });