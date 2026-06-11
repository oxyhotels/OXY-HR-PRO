import { adaptRoute } from '@/lib/adaptRoute';
import { approveRejectLeave } from '@/controllers/leave.controller';
import { authMiddleware } from '@/middlewares/auth.middleware';
import { restrictTo } from '@/middlewares/role.middleware';

export const PUT = adaptRoute(approveRejectLeave, {
  middlewares: [authMiddleware, restrictTo('ROOT_ADMIN', 'HOTEL_ADMIN', 'HR_MANAGER', 'DEPT_MANAGER')]
});
