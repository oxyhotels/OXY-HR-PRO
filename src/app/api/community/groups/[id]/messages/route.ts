import { adaptRoute } from '@/lib/adaptRoute';
import { getGroupMessages, sendMessage } from '@/controllers/community.controller';
import { authMiddleware } from '@/middlewares/auth.middleware';

export const GET = adaptRoute(getGroupMessages, { middlewares: [authMiddleware] });
export const POST = adaptRoute(sendMessage, { middlewares: [authMiddleware] });
