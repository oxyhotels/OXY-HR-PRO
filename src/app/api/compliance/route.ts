import { adaptRoute } from '@/lib/adaptRoute';
import { getComplianceLogs, createComplianceLog } from '@/controllers/compliance.controller';
import { authMiddleware } from '@/middlewares/auth.middleware';
import { restrictTo } from '@/middlewares/role.middleware';

export const GET = adaptRoute(getComplianceLogs, { middlewares: [authMiddleware] });
export const POST = adaptRoute(createComplianceLog, {
  middlewares: [authMiddleware, restrictTo('ROOT_ADMIN', 'HOTEL_ADMIN', 'HR_MANAGER', 'DEPT_MANAGER')]
});
