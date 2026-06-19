import { adaptRoute } from '@/lib/adaptRoute';
import { appreciateEmployee } from '@/controllers/gamification.controller';
import { authMiddleware } from '@/middlewares/auth.middleware';

export const POST = adaptRoute(appreciateEmployee, { middlewares: [authMiddleware] });
