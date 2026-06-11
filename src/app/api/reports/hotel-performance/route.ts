import { adaptRoute } from '@/lib/adaptRoute';
import { getHotelPerformance } from '@/controllers/report.controller';
import { authMiddleware } from '@/middlewares/auth.middleware';
import { restrictTo } from '@/middlewares/role.middleware';

export const GET = adaptRoute(getHotelPerformance, {
  middlewares: [authMiddleware, restrictTo('ROOT_ADMIN')]
});
