import { adaptRoute } from '@/lib/adaptRoute';
import { markAsRead } from '@/controllers/notification.controller';
import { authMiddleware } from '@/middlewares/auth.middleware';

export const PATCH = adaptRoute(markAsRead, { middlewares: [authMiddleware] });
