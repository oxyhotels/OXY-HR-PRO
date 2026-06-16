import { adaptRoute } from '@/lib/adaptRoute';
import { getLiveAttendance } from '@/controllers/attendance.controller';
import { authMiddleware } from '@/middlewares/auth.middleware';

export const GET = adaptRoute(getLiveAttendance, { middlewares: [authMiddleware] });
