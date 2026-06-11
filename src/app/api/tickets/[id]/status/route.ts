import { adaptRoute } from '@/lib/adaptRoute';
import { updateTicketStatus } from '@/controllers/ticket.controller';
import { authMiddleware } from '@/middlewares/auth.middleware';

export const PUT = adaptRoute(updateTicketStatus, { middlewares: [authMiddleware] });
