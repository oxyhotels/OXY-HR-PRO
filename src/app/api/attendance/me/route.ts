import { adaptRoute } from '@/lib/adaptRoute';
import { getMyAttendance } from '@/controllers/attendance.controller';
import { authMiddleware } from '@/middlewares/auth.middleware';

export const GET = adaptRoute(getMyAttendance, { middlewares: [authMiddleware] });
