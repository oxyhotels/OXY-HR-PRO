import { adaptRoute } from '@/lib/adaptRoute';
import { getEmployeeTrackingHistory } from '@/controllers/tracking.controller';
import { authMiddleware } from '@/middlewares/auth.middleware';

export const GET = adaptRoute(getEmployeeTrackingHistory, { middlewares: [authMiddleware] });