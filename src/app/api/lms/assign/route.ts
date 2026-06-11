import { adaptRoute } from '@/lib/adaptRoute';
import { assignCourse, getAssignments } from '@/controllers/lms.controller';
import { authMiddleware } from '@/middlewares/auth.middleware';
import { restrictTo } from '@/middlewares/role.middleware';

export const POST = adaptRoute(assignCourse, {
  middlewares: [authMiddleware, restrictTo('ROOT_ADMIN', 'HOTEL_ADMIN', 'HR_MANAGER', 'DEPT_MANAGER')]
});

export const GET = adaptRoute(getAssignments, {
  middlewares: [authMiddleware]
});
