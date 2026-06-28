import { adaptRoute } from '@/lib/adaptRoute';
import { authMiddleware } from '@/middlewares/auth.middleware';
import { requestDeleteReport } from '@/controllers/propertyReport.controller';

export const PATCH = adaptRoute(requestDeleteReport, { middlewares: [authMiddleware] });
