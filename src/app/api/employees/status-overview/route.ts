import { adaptRoute } from '@/lib/adaptRoute';
import { getStaffOverview } from '@/controllers/employee.controller';
import { authMiddleware } from '@/middlewares/auth.middleware';

export const GET = adaptRoute(getStaffOverview, { middlewares: [authMiddleware] });
