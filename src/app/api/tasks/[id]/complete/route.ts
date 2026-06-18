import { adaptRoute } from '@/lib/adaptRoute';
import { completeTask } from '@/controllers/taskWorkflow.controller';
import { authMiddleware } from '@/middlewares/auth.middleware';

export const POST = adaptRoute(completeTask, { middlewares: [authMiddleware] });