import { adaptRoute } from '@/lib/adaptRoute';
import { getHotelById, updateHotel, deleteHotel } from '@/controllers/hotel.controller';
import { authMiddleware } from '@/middlewares/auth.middleware';
import { restrictTo } from '@/middlewares/role.middleware';

const middlewares = [authMiddleware, restrictTo('ROOT_ADMIN')];

export const GET = adaptRoute(getHotelById, { middlewares });
export const PUT = adaptRoute(updateHotel, { middlewares });
export const DELETE = adaptRoute(deleteHotel, { middlewares });
