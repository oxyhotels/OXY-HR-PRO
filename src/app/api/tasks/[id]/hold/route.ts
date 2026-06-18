import { adaptRoute } from '@/lib/adaptRoute';
import { holdTask } from '@/controllers/taskWorkflow.controller';
import { authMiddleware } from '@/middlewares/auth.middleware';

export const POST = adaptRoute(holdTask, { middlewares: [authMiddleware] });