import { adaptRoute } from '@/lib/adaptRoute';
import { addLocationUpdate } from '@/controllers/tracking.controller';
import { authMiddleware } from '@/middlewares/auth.middleware';

export const POST = adaptRoute(addLocationUpdate, { middlewares: [authMiddleware] });