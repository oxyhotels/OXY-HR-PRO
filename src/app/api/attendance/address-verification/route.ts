import { adaptRoute } from '@/lib/adaptRoute';
import { getAddressVerification } from '@/controllers/attendance.controller';
import { authMiddleware } from '@/middlewares/auth.middleware';

export const GET = adaptRoute(getAddressVerification, { middlewares: [authMiddleware] });
