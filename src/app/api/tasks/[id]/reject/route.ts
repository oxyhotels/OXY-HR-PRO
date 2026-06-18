import { adaptRoute } from '@/lib/adaptRoute';
import { rejectTask } from '@/controllers/taskWorkflow.controller';
import { authMiddleware } from '@/middlewares/auth.middleware';

export const POST = adaptRoute(rejectTask, { middlewares: [authMiddleware] });