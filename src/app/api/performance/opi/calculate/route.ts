import { adaptRoute } from '@/lib/adaptRoute';
import { calculatePerformanceIndex } from '@/controllers/performance.controller';
import { authMiddleware } from '@/middlewares/auth.middleware';
import { restrictTo } from '@/middlewares/role.middleware';

export const POST = adaptRoute(calculatePerformanceIndex, {
  middlewares: [authMiddleware, restrictTo('ROOT_ADMIN', 'HOTEL_ADMIN', 'HR_MANAGER')]
});
