import { adaptRoute } from '@/lib/adaptRoute';
import { joinHierarchy } from '@/controllers/hierarchy.controller';

export const POST = adaptRoute(joinHierarchy);
