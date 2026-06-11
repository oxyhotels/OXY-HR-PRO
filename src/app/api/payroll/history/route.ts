import { adaptRoute } from '@/lib/adaptRoute';
import { getPayrollHistory } from '@/controllers/payroll.controller';
import { authMiddleware } from '@/middlewares/auth.middleware';

export const GET = adaptRoute(getPayrollHistory, { middlewares: [authMiddleware] });
