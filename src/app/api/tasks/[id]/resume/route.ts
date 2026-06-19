import { adaptRoute } from '@/lib/adaptRoute';
import { resumeTask } from '@/controllers/taskWorkflow.controller';
import { authMiddleware } from '@/middlewares/auth.middleware';

export const POST = adaptRoute(resumeTask, { middlewares: [authMiddleware] });