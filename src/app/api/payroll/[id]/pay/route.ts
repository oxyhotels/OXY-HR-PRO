import { adaptRoute } from '@/lib/adaptRoute';
import { paySalary } from '@/controllers/payroll.controller';
import { authMiddleware } from '@/middlewares/auth.middleware';
import { restrictTo } from '@/middlewares/role.middleware';

export const PUT = adaptRoute(paySalary, {
  middlewares: [authMiddleware, restrictTo('ROOT_ADMIN', 'HOTEL_ADMIN', 'HR_MANAGER')]
});
