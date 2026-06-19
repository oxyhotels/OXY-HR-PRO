import { adaptRoute } from '@/lib/adaptRoute';
import { updateTaskProgress } from '@/controllers/taskWorkflow.controller';
import { authMiddleware } from '@/middlewares/auth.middleware';

export const POST = adaptRoute(updateTaskProgress, { middlewares: [authMiddleware] });