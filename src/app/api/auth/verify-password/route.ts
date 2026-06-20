import { adaptRoute } from '@/lib/adaptRoute';
import { verifyPassword } from '@/controllers/auth.controller';
import { authMiddleware } from '@/middlewares/auth.middleware';

export const POST = adaptRoute(verifyPassword, { middlewares: [authMiddleware] });
