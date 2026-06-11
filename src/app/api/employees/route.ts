import { adaptRoute } from '@/lib/adaptRoute';
import { getEmployees, createEmployee } from '@/controllers/employee.controller';
import { authMiddleware } from '@/middlewares/auth.middleware';
import { restrictTo } from '@/middlewares/role.middleware';

export const GET = adaptRoute(getEmployees, { middlewares: [authMiddleware] });
export const POST = adaptRoute(createEmployee, {
  middlewares: [authMiddleware, restrictTo('ROOT_ADMIN', 'HOTEL_ADMIN', 'HR_MANAGER')]
});
