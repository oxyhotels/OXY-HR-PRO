import { adaptRoute } from '@/lib/adaptRoute';
import { startTrackingSession } from '@/controllers/tracking.controller';
import { authMiddleware } from '@/middlewares/auth.middleware';

export const POST = adaptRoute(startTrackingSession, { middlewares: [authMiddleware] });