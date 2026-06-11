import { adaptRoute } from '@/lib/adaptRoute';
import { getPayrollReport } from '@/controllers/report.controller';
import { authMiddleware } from '@/middlewares/auth.middleware';

export const GET = adaptRoute(getPayrollReport, { middlewares: [authMiddleware] });
