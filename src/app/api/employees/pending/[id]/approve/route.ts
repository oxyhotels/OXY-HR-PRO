import { adaptRoute } from '@/lib/adaptRoute';
import { approveSignup } from '@/controllers/employee.controller';
import { authMiddleware } from '@/middlewares/auth.middleware';
import { restrictTo } from '@/middlewares/role.middleware';

export const POST = adaptRoute(approveSignup, {
  middlewares: [authMiddleware, restrictTo('ROOT_ADMIN', 'HOTEL_ADMIN')]
});
