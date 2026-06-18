import { adaptRoute } from '@/lib/adaptRoute';
import { getTaskResponses } from '@/controllers/taskWorkflow.controller';
import { authMiddleware } from '@/middlewares/auth.middleware';

export const GET = adaptRoute(getTaskResponses, { middlewares: [authMiddleware] });