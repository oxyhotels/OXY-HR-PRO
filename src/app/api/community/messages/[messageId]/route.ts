import { adaptRoute } from '@/lib/adaptRoute';
import { editMessage, deleteMessage } from '@/controllers/community.controller';
import { authMiddleware } from '@/middlewares/auth.middleware';

export const PUT = adaptRoute(editMessage, { middlewares: [authMiddleware] });
export const DELETE = adaptRoute(deleteMessage, { middlewares: [authMiddleware] });
