import { adaptRoute } from '@/lib/adaptRoute';
import { deletePropertyReport } from '@/controllers/propertyReport.controller';
import { authMiddleware } from '@/middlewares/auth.middleware';

export const DELETE = adaptRoute(deletePropertyReport, { middlewares: [authMiddleware] });
