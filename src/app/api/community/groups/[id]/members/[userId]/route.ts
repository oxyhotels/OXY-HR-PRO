import { adaptRoute } from '@/lib/adaptRoute';
import { removeGroupMember } from '@/controllers/community.controller';
import { authMiddleware } from '@/middlewares/auth.middleware';

export const DELETE = adaptRoute(removeGroupMember, { middlewares: [authMiddleware] });
