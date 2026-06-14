import { adaptRoute } from '@/lib/adaptRoute';
import { getAttendanceExportData } from '@/controllers/report.controller';
import { authMiddleware } from '@/middlewares/auth.middleware';

export const GET = adaptRoute(getAttendanceExportData, { middlewares: [authMiddleware] });
