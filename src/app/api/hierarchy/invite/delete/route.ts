import { adaptRoute } from '@/lib/adaptRoute';
import { deleteInvite } from '@/controllers/hierarchy.controller';
import { authMiddleware } from '@/middlewares/auth.middleware';
import { restrictTo } from '@/middlewares/role.middleware';

const middlewares = [authMiddleware, restrictTo('ROOT_ADMIN')];

export const POST = adaptRoute(deleteInvite, { middlewares });
