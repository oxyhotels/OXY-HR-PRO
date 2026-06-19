import { adaptRoute } from '@/lib/adaptRoute';
import { updateTaskStatus } from '@/controllers/taskStatusUpdate.controller';
import { authMiddleware } from '@/middlewares/auth.middleware';

export const POST = adaptRoute(updateTaskStatus, { middlewares: [authMiddleware] });