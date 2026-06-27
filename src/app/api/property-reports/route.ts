import { adaptRoute } from '@/lib/adaptRoute';
import { createPropertyReport, getPropertyReports } from '@/controllers/propertyReport.controller';
import { authMiddleware } from '@/middlewares/auth.middleware';

export const POST = adaptRoute(createPropertyReport, { middlewares: [authMiddleware] });
export const GET = adaptRoute(getPropertyReports, { middlewares: [authMiddleware] });
