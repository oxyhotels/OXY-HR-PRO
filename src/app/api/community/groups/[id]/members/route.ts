import { adaptRoute } from '@/lib/adaptRoute';
import { addGroupMember } from '@/controllers/community.controller';
import { authMiddleware } from '@/middlewares/auth.middleware';

export const POST = adaptRoute(addGroupMember, { middlewares: [authMiddleware] });
