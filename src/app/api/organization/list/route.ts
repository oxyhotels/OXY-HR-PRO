import { adaptRoute } from '@/lib/adaptRoute';
import { getOrganizations } from '@/controllers/hierarchy.controller';
import { authMiddleware } from '@/middlewares/auth.middleware';

const middlewares = [authMiddleware];

export const GET = adaptRoute(getOrganizations, { middlewares });
