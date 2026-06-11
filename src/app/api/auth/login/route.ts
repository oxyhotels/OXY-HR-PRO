import { adaptRoute } from '@/lib/adaptRoute';
import { login } from '@/controllers/auth.controller';
import { authRateLimiter } from '@/middlewares/rateLimiter.middleware';

export const POST = adaptRoute(login, { middlewares: [authRateLimiter] });
