import { adaptRoute } from '@/lib/adaptRoute';
import { endTrackingSession } from '@/controllers/tracking.controller';
import { authMiddleware } from '@/middlewares/auth.middleware';

export const POST = adaptRoute(endTrackingSession, { middlewares: [authMiddleware] });