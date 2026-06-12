import { adaptRoute } from '@/lib/adaptRoute';
import { votePollOption } from '@/controllers/community.controller';
import { authMiddleware } from '@/middlewares/auth.middleware';

export const POST = adaptRoute(votePollOption, { middlewares: [authMiddleware] });
