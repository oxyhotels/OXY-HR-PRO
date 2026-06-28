export const dynamic = 'force-dynamic';

import { adaptRoute } from '@/lib/adaptRoute';
import { resetActivityBadge } from '@/controllers/activityBadge.controller';
import { authMiddleware } from '@/middlewares/auth.middleware';

export const PATCH = adaptRoute(resetActivityBadge, { middlewares: [authMiddleware] });
