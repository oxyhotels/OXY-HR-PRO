import { adaptRoute } from '@/lib/adaptRoute';
import { getEmployeeById, updateEmployee, deleteEmployee } from '@/controllers/employee.controller';
import { authMiddleware } from '@/middlewares/auth.middleware';
import { restrictTo } from '@/middlewares/role.middleware';

export const GET = adaptRoute(getEmployeeById, { middlewares: [authMiddleware] });
export const PUT = adaptRoute(updateEmployee, { middlewares: [authMiddleware] });
export const DELETE = adaptRoute(deleteEmployee, {
  middlewares: [authMiddleware, restrictTo('ROOT_ADMIN', 'HOTEL_ADMIN', 'HR_MANAGER')]
});
