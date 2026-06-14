import { adaptRoute } from '@/lib/adaptRoute';
import { getNotifications, markAllAsRead } from '@/controllers/notification.controller';
import { authMiddleware } from '@/middlewares/auth.middleware';

export const GET = adaptRoute(getNotifications, { middlewares: [authMiddleware] });
export const PATCH = adaptRoute(markAllAsRead, { middlewares: [authMiddleware] });
