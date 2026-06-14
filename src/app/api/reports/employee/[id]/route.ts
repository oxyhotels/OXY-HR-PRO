import { adaptRoute } from '@/lib/adaptRoute';
import { getEmployeeReport } from '@/controllers/report.controller';
import { authMiddleware } from '@/middlewares/auth.middleware';

export const GET = adaptRoute(getEmployeeReport, { middlewares: [authMiddleware] });
