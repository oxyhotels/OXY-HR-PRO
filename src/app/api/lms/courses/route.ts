import { adaptRoute } from '@/lib/adaptRoute';
import { getCourses, createCourse } from '@/controllers/lms.controller';
import { authMiddleware } from '@/middlewares/auth.middleware';
import { restrictTo } from '@/middlewares/role.middleware';

export const GET = adaptRoute(getCourses, { middlewares: [authMiddleware] });
export const POST = adaptRoute(createCourse, {
  middlewares: [authMiddleware, restrictTo('ROOT_ADMIN', 'HOTEL_ADMIN', 'HR_MANAGER')]
});
