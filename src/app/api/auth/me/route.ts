import { adaptRoute } from '@/lib/adaptRoute';
import { getMe } from '@/controllers/auth.controller';
import { authMiddleware } from '@/middlewares/auth.middleware';

export const GET = adaptRoute(getMe, { middlewares: [authMiddleware] });
