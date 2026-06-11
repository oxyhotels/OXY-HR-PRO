import { adaptRoute } from '@/lib/adaptRoute';
import { editCourse, deleteCourse } from '@/controllers/lms.controller';
import { authMiddleware } from '@/middlewares/auth.middleware';
import { restrictTo } from '@/middlewares/role.middleware';

export const PUT = adaptRoute(editCourse, {
  middlewares: [authMiddleware]
});

export const DELETE = adaptRoute(deleteCourse, {
  middlewares: [authMiddleware]
});
