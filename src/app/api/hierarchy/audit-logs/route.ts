import { adaptRoute } from '@/lib/adaptRoute';
import { getHierarchyAuditLogs } from '@/controllers/hierarchy.controller';
import { authMiddleware } from '@/middlewares/auth.middleware';

const middlewares = [authMiddleware];

export const GET = adaptRoute(getHierarchyAuditLogs, { middlewares });
