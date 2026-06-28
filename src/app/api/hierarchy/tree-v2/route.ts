export const dynamic = 'force-dynamic';

import { adaptRoute } from '@/lib/adaptRoute';
import { getEnterpriseHierarchyTree } from '@/controllers/hierarchy.controller';
import { authMiddleware } from '@/middlewares/auth.middleware';

export const GET = adaptRoute(getEnterpriseHierarchyTree, { middlewares: [authMiddleware] });
