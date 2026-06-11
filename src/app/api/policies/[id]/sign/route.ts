import { adaptRoute } from '@/lib/adaptRoute';
import { signPolicy } from '@/controllers/policy.controller';
import { authMiddleware } from '@/middlewares/auth.middleware';

export const POST = adaptRoute(signPolicy, { middlewares: [authMiddleware] });
