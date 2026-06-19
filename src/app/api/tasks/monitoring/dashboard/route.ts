import { adaptRoute } from '@/lib/adaptRoute';
import { getTaskMonitoringDashboard } from '@/controllers/taskWorkflow.controller';
import { authMiddleware } from '@/middlewares/auth.middleware';
import { restrictTo } from '@/middlewares/role.middleware';

export const GET = adaptRoute(getTaskMonitoringDashboard, { 
  middlewares: [authMiddleware, restrictTo('ROOT_ADMIN')] 
});