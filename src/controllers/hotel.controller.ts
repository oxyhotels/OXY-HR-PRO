import { Request, Response, NextFunction } from 'express';
import { Hotel } from '@/models/Hotel';
import { User } from '@/models/User';
import { ApiError } from '@/utils/ApiError';
import { AuditLog } from '@/models/AuditLog';

export const createHotel = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, code, email, phone, address, googleLocationLink, subscriptionPlan } = req.body;

    const existingHotel = await Hotel.findOne({ code: code.toLowerCase() });
    if (existingHotel) {
      throw new ApiError(400, 'Hotel with this code already exists');
    }

    const hotel = await Hotel.create({
      name,
      code,
      email,
      phone,
      address,
      googleLocationLink,
      subscriptionPlan,
    });

    if (req.user) {
      AuditLog.create({
        user: req.user._id,
        action: 'CREATE_HOTEL',
        module: 'HOTEL',
        details: `Hotel ${name} (${code}) created`,
      }).catch(err => console.error('Failed to create audit log:', err));
    }

    res.status(201).json({
      status: 'success',
      data: { hotel },
    });
  } catch (error) {
    next(error);
  }
};

export const getHotels = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const hotels = await Hotel.find().sort({ createdAt: 1 });
    res.status(200).json({
      status: 'success',
      results: hotels.length,
      data: { hotels },
    });
  } catch (error) {
    next(error);
  }
};

export const getHotelById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const hotel = await Hotel.findById(req.params.id);
    if (!hotel) {
      throw new ApiError(404, 'Hotel not found');
    }
    res.status(200).json({
      status: 'success',
      data: { hotel },
    });
  } catch (error) {
    next(error);
  }
};

export const updateHotel = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const hotel = await Hotel.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!hotel) {
      throw new ApiError(404, 'Hotel not found');
    }

    if (req.user) {
      AuditLog.create({
        user: req.user._id,
        action: 'UPDATE_HOTEL',
        module: 'HOTEL',
        details: `Hotel ${hotel.name} updated`,
      }).catch(err => console.error('Failed to create audit log:', err));
    }

    res.status(200).json({
      status: 'success',
      data: { hotel },
    });
  } catch (error) {
    next(error);
  }
};

export const deleteHotel = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const hotel = await Hotel.findByIdAndDelete(req.params.id);
    if (!hotel) {
      throw new ApiError(404, 'Hotel not found');
    }

    // Terminate users in this hotel
    await User.updateMany({ hotel: hotel._id }, { status: 'Terminated' });

    if (req.user) {
      AuditLog.create({
        user: req.user._id,
        action: 'DELETE_HOTEL',
        module: 'HOTEL',
        details: `Hotel ${hotel.name} deleted, associated staff deactivated`,
      }).catch(err => console.error('Failed to create audit log:', err));
    }

    res.status(204).json({
      status: 'success',
      data: null,
    });
  } catch (error) {
    next(error);
  }
};
