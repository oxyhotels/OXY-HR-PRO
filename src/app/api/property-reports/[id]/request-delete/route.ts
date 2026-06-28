import { adaptRoute } from '@/lib/apiAdapter';
import { authMiddleware } from '@/middlewares/auth.middleware';
import { requestDeleteReport } from '@/controllers/propertyReport.controller';

export const PATCH = adaptRoute(requestDeleteReport, { middlewares: [authMiddleware] });
