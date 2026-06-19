import { adaptRoute } from '@/lib/adaptRoute';
import { getMyTasks } from '@/controllers/taskWorkflow.controller';
import { authMiddleware } from '@/middlewares/auth.middleware';

export const GET = adaptRoute(getMyTasks, { middlewares: [authMiddleware] });