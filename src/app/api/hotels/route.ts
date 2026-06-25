export const dynamic = 'force-dynamic';

import { adaptRoute } from '@/lib/adaptRoute';
import { getHotels, createHotel } from '@/controllers/hotel.controller';
import { authMiddleware } from '@/middlewares/auth.middleware';
import { restrictTo } from '@/middlewares/role.middleware';

const middlewares = [authMiddleware, restrictTo('ROOT_ADMIN')];

export const GET = adaptRoute(getHotels, {
  middlewares: [authMiddleware, restrictTo('ROOT_ADMIN', 'HOTEL_ADMIN', 'HR_MANAGER', 'DEPT_MANAGER')]
});
export const POST = adaptRoute(createHotel, { middlewares });
