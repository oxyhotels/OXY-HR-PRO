import { adaptRoute } from '@/lib/adaptRoute';
import { getAttendanceReport } from '@/controllers/report.controller';
import { authMiddleware } from '@/middlewares/auth.middleware';

export const GET = adaptRoute(getAttendanceReport, { middlewares: [authMiddleware] });
