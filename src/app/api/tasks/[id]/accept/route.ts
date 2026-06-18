import { adaptRoute } from '@/lib/adaptRoute';
import { acceptTask } from '@/controllers/taskWorkflow.controller';
import { authMiddleware } from '@/middlewares/auth.middleware';

export const POST = adaptRoute(acceptTask, { middlewares: [authMiddleware] });