import { adaptRoute } from '@/lib/adaptRoute';
import { logout } from '@/controllers/auth.controller';
import { authMiddleware } from '@/middlewares/auth.middleware';

export const POST = adaptRoute(logout, { middlewares: [authMiddleware] });
