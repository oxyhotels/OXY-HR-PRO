export const revalidate = 3600; // Cache for 1 hour

import { adaptRoute } from '@/lib/adaptRoute';
import { Hotel } from '@/models/Hotel';
import { Request, Response, NextFunction } from 'express';

const getPublicHotels = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const hotels = await Hotel.find({ status: 'Active' }).sort({ createdAt: 1 }).select('name hotelCode _id');
    res.status(200).json({
      status: 'success',
      data: { hotels },
    });
  } catch (error) {
    next(error);
  }
};

export const GET = adaptRoute(getPublicHotels);
