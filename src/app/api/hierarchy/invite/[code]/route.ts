import { adaptRoute } from '@/lib/adaptRoute';
import { getInviteDetails } from '@/controllers/hierarchy.controller';

export const GET = adaptRoute(getInviteDetails);
