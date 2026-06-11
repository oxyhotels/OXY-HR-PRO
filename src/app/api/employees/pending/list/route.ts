import { adaptRoute } from '@/lib/adaptRoute';
import { getPendingSignups } from '@/controllers/employee.controller';
import { authMiddleware } from '@/middlewares/auth.middleware';
import { restrictTo } from '@/middlewares/role.middleware';

export const GET = adaptRoute(getPendingSignups, {
  middlewares: [authMiddleware, restrictTo('ROOT_ADMIN', 'HOTEL_ADMIN')]
});
