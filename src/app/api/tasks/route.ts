import { adaptRoute } from '@/lib/adaptRoute';
import { getTasks, createTask } from '@/controllers/task.controller';
import { authMiddleware } from '@/middlewares/auth.middleware';
import { restrictTo } from '@/middlewares/role.middleware';

export const GET = adaptRoute(getTasks, { middlewares: [authMiddleware] });
export const POST = adaptRoute(createTask, {
  middlewares: [authMiddleware, restrictTo('ROOT_ADMIN', 'HOTEL_ADMIN', 'HR_MANAGER', 'DEPT_MANAGER', 'EMPLOYEE')]
});
