import { adaptRoute } from '@/lib/adaptRoute';
import { toggleInviteStatus } from '@/controllers/hierarchy.controller';
import { authMiddleware } from '@/middlewares/auth.middleware';
import { restrictTo } from '@/middlewares/role.middleware';

const middlewares = [authMiddleware, restrictTo('ROOT_ADMIN', 'HOTEL_ADMIN', 'HR_MANAGER', 'DEPT_MANAGER')];

export const POST = adaptRoute(toggleInviteStatus, { middlewares });
