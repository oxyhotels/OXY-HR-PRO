import { adaptRoute } from '@/lib/adaptRoute';
import { getKnowledgeItems, createKnowledgeItem } from '@/controllers/knowledge.controller';
import { authMiddleware } from '@/middlewares/auth.middleware';

export const GET = adaptRoute(getKnowledgeItems, { middlewares: [authMiddleware] });
export const POST = adaptRoute(createKnowledgeItem, { middlewares: [authMiddleware] });
