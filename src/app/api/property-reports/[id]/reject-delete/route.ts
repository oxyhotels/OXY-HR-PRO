import { adaptRoute } from '@/lib/apiAdapter';
import { authMiddleware } from '@/middlewares/auth.middleware';
import { rejectDeleteReport } from '@/controllers/propertyReport.controller';

export const PATCH = adaptRoute(rejectDeleteReport, { middlewares: [authMiddleware] });
