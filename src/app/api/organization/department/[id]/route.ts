import { adaptRoute } from '@/lib/adaptRoute';
import { updateDepartment, deleteDepartment } from '@/controllers/hierarchy.controller';
import { authMiddleware } from '@/middlewares/auth.middleware';
import { restrictTo } from '@/middlewares/role.middleware';

const patchMiddlewares = [authMiddleware, restrictTo('ROOT_ADMIN', 'HOTEL_ADMIN', 'HR_MANAGER', 'DEPT_MANAGER')];
const deleteMiddlewares = [authMiddleware, restrictTo('ROOT_ADMIN')];

export const PATCH = adaptRoute(updateDepartment, { middlewares: patchMiddlewares });
export const DELETE = adaptRoute(deleteDepartment, { middlewares: deleteMiddlewares });
