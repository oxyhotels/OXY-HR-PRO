import { adaptRoute } from '@/lib/adaptRoute';
import { savePushToken, deletePushToken } from '@/controllers/community.controller';
import { authMiddleware } from '@/middlewares/auth.middleware';

export const POST = adaptRoute(savePushToken, { middlewares: [authMiddleware] });
export const DELETE = adaptRoute(deletePushToken, { middlewares: [authMiddleware] });
