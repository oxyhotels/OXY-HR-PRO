import { adaptRoute } from '@/lib/adaptRoute';
import { register } from '@/controllers/auth.controller';
import { authRateLimiter } from '@/middlewares/rateLimiter.middleware';

export const POST = adaptRoute(register, { middlewares: [authRateLimiter] });
