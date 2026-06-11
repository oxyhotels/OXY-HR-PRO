import { adaptRoute } from '@/lib/adaptRoute';
import { getPolicies, createPolicy } from '@/controllers/policy.controller';
import { authMiddleware } from '@/middlewares/auth.middleware';
import { restrictTo } from '@/middlewares/role.middleware';

export const GET = adaptRoute(getPolicies, { middlewares: [authMiddleware] });
export const POST = adaptRoute(createPolicy, {
  middlewares: [authMiddleware, restrictTo('ROOT_ADMIN', 'HOTEL_ADMIN', 'HR_MANAGER')]
});
