import { adaptRoute } from '@/lib/adaptRoute';
import { getHotelAttendance } from '@/controllers/attendance.controller';
import { authMiddleware } from '@/middlewares/auth.middleware';
import { restrictTo } from '@/middlewares/role.middleware';

export const GET = adaptRoute(getHotelAttendance, {
  middlewares: [authMiddleware, restrictTo('ROOT_ADMIN', 'HOTEL_ADMIN', 'HR_MANAGER', 'DEPT_MANAGER')]
});
