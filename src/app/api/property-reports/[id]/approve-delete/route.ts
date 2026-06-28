import { adaptRoute } from '@/lib/adaptRoute';
import { authMiddleware } from '@/middlewares/auth.middleware';
import { approveDeleteReport } from '@/controllers/propertyReport.controller';

export const PATCH = adaptRoute(approveDeleteReport, { middlewares: [authMiddleware] });
