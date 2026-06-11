import { adaptRoute } from '@/lib/adaptRoute';
import { getOpiMetrics } from '@/controllers/performance.controller';
import { authMiddleware } from '@/middlewares/auth.middleware';

export const GET = adaptRoute(getOpiMetrics, { middlewares: [authMiddleware] });
