import { adaptRoute } from '@/lib/adaptRoute';
import { calculatePayroll } from '@/controllers/payroll.controller';
import { authMiddleware } from '@/middlewares/auth.middleware';
import { restrictTo } from '@/middlewares/role.middleware';

export const POST = adaptRoute(calculatePayroll, {
  middlewares: [authMiddleware, restrictTo('ROOT_ADMIN', 'HOTEL_ADMIN', 'HR_MANAGER')]
});
