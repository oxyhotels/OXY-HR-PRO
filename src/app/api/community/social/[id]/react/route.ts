import { adaptRoute } from '@/lib/adaptRoute';
import { reactSocialPost } from '@/controllers/social.controller';
import { authMiddleware } from '@/middlewares/auth.middleware';

export const POST = adaptRoute(reactSocialPost, { middlewares: [authMiddleware] });
