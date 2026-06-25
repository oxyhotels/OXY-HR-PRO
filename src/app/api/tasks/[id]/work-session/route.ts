import { adaptRoute } from '@/lib/adaptRoute';
import { handleWorkSession } from '@/controllers/taskWorkSession.controller';
import { authMiddleware } from '@/middlewares/auth.middleware';

export const POST = adaptRoute(handleWorkSession, { middlewares: [authMiddleware] });
