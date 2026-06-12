import { adaptRoute } from '@/lib/adaptRoute';
import { getSocialPosts, createSocialPost } from '@/controllers/social.controller';
import { authMiddleware } from '@/middlewares/auth.middleware';

export const GET = adaptRoute(getSocialPosts, { middlewares: [authMiddleware] });
export const POST = adaptRoute(createSocialPost, { middlewares: [authMiddleware] });
