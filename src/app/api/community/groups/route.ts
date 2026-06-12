import { adaptRoute } from '@/lib/adaptRoute';
import { getGroups, createGroup } from '@/controllers/community.controller';
import { authMiddleware } from '@/middlewares/auth.middleware';

export const GET = adaptRoute(getGroups, { middlewares: [authMiddleware] });
export const POST = adaptRoute(createGroup, { middlewares: [authMiddleware] });
