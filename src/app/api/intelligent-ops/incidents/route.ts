import { adaptRoute } from '@/lib/adaptRoute';
import { createIncident, getIncidents } from '@/controllers/intelligentOps.controller';
import { authMiddleware } from '@/middlewares/auth.middleware';

export const POST = adaptRoute(createIncident, {
  middlewares: [authMiddleware]
});

export const GET = adaptRoute(getIncidents, {
  middlewares: [authMiddleware]
});
