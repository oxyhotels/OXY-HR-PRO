import { adaptRoute } from '@/lib/adaptRoute';
import { getHotels, createHotel } from '@/controllers/hotel.controller';
import { authMiddleware } from '@/middlewares/auth.middleware';
import { restrictTo } from '@/middlewares/role.middleware';

const middlewares = [authMiddleware, restrictTo('ROOT_ADMIN')];

export const GET = adaptRoute(getHotels, { middlewares });
export const POST = adaptRoute(createHotel, { middlewares });
