import { adaptRoute } from '@/lib/adaptRoute';
import { createCallToken } from '@/controllers/community.controller';
import { authMiddleware } from '@/middlewares/auth.middleware';

export const POST = adaptRoute(createCallToken, { middlewares: [authMiddleware] });
