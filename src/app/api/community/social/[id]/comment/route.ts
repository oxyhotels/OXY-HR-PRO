import { adaptRoute } from '@/lib/adaptRoute';
import { commentSocialPost } from '@/controllers/social.controller';
import { authMiddleware } from '@/middlewares/auth.middleware';

export const POST = adaptRoute(commentSocialPost, { middlewares: [authMiddleware] });
