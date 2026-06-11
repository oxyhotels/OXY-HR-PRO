import { adaptRoute } from '@/lib/adaptRoute';
import { getPermissionMatrix } from '@/controllers/role.controller';
import { authMiddleware } from '@/middlewares/auth.middleware';

export const GET = adaptRoute(getPermissionMatrix, { middlewares: [authMiddleware] });
