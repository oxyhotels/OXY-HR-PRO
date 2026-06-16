import { adaptRoute } from '@/lib/adaptRoute';
import { getTeamStructure } from '@/controllers/hierarchy.controller';
import { authMiddleware } from '@/middlewares/auth.middleware';

const middlewares = [authMiddleware];

export const GET = adaptRoute(getTeamStructure, { middlewares });
