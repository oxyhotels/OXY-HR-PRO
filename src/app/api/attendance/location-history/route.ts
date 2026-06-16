import { adaptRoute } from '@/lib/adaptRoute';
import { getLocationHistory } from '@/controllers/attendance.controller';
import { authMiddleware } from '@/middlewares/auth.middleware';

export const GET = adaptRoute(getLocationHistory, { middlewares: [authMiddleware] });
