export const dynamic = 'force-dynamic';

import { adaptRoute } from '@/lib/adaptRoute';
import { getActivityBadges } from '@/controllers/activityBadge.controller';
import { authMiddleware } from '@/middlewares/auth.middleware';

export const GET = adaptRoute(getActivityBadges, { middlewares: [authMiddleware] });
