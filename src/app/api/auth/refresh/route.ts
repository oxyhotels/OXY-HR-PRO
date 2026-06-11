import { adaptRoute } from '@/lib/adaptRoute';
import { refresh } from '@/controllers/auth.controller';

export const POST = adaptRoute(refresh);
