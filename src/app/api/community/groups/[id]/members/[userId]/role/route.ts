import { adaptRoute } from '@/lib/adaptRoute';
import { updateGroupMemberRole } from '@/controllers/community.controller';
import { authMiddleware } from '@/middlewares/auth.middleware';

export const PUT = adaptRoute(updateGroupMemberRole, { middlewares: [authMiddleware] });
