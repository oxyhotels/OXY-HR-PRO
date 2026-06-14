import { adaptRoute } from '@/lib/adaptRoute';
import { getAttendanceReportLogs } from '@/controllers/report.controller';
import { authMiddleware } from '@/middlewares/auth.middleware';

export const GET = adaptRoute(getAttendanceReportLogs, { middlewares: [authMiddleware] });
