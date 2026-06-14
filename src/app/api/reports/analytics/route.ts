import { adaptRoute } from '@/lib/adaptRoute';
import { getAnalyticsData } from '@/controllers/report.controller';
import { authMiddleware } from '@/middlewares/auth.middleware';

export const GET = adaptRoute(getAnalyticsData, { middlewares: [authMiddleware] });
