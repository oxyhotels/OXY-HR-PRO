import { adaptRoute } from '@/lib/adaptRoute';
import { getGroupById, updateGroup } from '@/controllers/community.controller';
import { authMiddleware } from '@/middlewares/auth.middleware';

export const GET = adaptRoute(getGroupById, { middlewares: [authMiddleware] });
export const PUT = adaptRoute(updateGroup, { middlewares: [authMiddleware] });
