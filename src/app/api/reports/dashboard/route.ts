import { adaptRoute } from '@/lib/adaptRoute';
import { getDashboardStats } from '@/controllers/report.controller';
import { authMiddleware } from '@/middlewares/auth.middleware';

export const GET = adaptRoute(getDashboardStats, { middlewares: [authMiddleware] });
