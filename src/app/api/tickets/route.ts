import { adaptRoute } from '@/lib/adaptRoute';
import { getTickets, createTicket } from '@/controllers/ticket.controller';
import { authMiddleware } from '@/middlewares/auth.middleware';

export const GET = adaptRoute(getTickets, { middlewares: [authMiddleware] });
export const POST = adaptRoute(createTicket, { middlewares: [authMiddleware] });
