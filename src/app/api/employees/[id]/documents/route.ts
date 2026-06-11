import { adaptRoute } from '@/lib/adaptRoute';
import { uploadDocument } from '@/controllers/employee.controller';
import { authMiddleware } from '@/middlewares/auth.middleware';
import { restrictTo } from '@/middlewares/role.middleware';

export const POST = adaptRoute(uploadDocument, {
  middlewares: [authMiddleware, restrictTo('ROOT_ADMIN', 'HOTEL_ADMIN', 'HR_MANAGER')]
});
