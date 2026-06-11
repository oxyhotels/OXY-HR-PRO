import { adaptRoute } from '@/lib/adaptRoute';
import { resetPassword } from '@/controllers/auth.controller';
import { authRateLimiter } from '@/middlewares/rateLimiter.middleware';

export const POST = adaptRoute(resetPassword, { middlewares: [authRateLimiter] });
