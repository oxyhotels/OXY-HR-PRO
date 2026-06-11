import { adaptRoute } from '@/lib/adaptRoute';
import { forgotPassword } from '@/controllers/auth.controller';
import { authRateLimiter } from '@/middlewares/rateLimiter.middleware';

export const POST = adaptRoute(forgotPassword, { middlewares: [authRateLimiter] });
