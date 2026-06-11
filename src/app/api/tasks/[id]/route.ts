import { adaptRoute } from '@/lib/adaptRoute';
import { updateTask, deleteTask } from '@/controllers/task.controller';
import { authMiddleware } from '@/middlewares/auth.middleware';
import { restrictTo } from '@/middlewares/role.middleware';

export const PUT = adaptRoute(updateTask, { middlewares: [authMiddleware] });
export const DELETE = adaptRoute(deleteTask, {
  middlewares: [authMiddleware, restrictTo('ROOT_ADMIN', 'HOTEL_ADMIN', 'HR_MANAGER', 'DEPT_MANAGER')]
});
