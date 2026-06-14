import { adaptRoute } from '@/lib/adaptRoute';
import { getWorkLogsExportData } from '@/controllers/report.controller';
import { authMiddleware } from '@/middlewares/auth.middleware';

export const GET = adaptRoute(getWorkLogsExportData, { middlewares: [authMiddleware] });
