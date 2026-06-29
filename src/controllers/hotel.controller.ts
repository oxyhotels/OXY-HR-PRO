import { Request, Response, NextFunction } from 'express';
import { Hotel } from '@/models/Hotel';
import { User } from '@/models/User';
import { ApiError } from '@/utils/ApiError';
import { AuditLog } from '@/models/AuditLog';
import { diffFields, logAuditTrail } from '@/utils/audit';

export const createHotel = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, email, phone, address, googleLocationLink, subscriptionPlan } = req.body;
    let { hotelCode } = req.body;

    if (!hotelCode || hotelCode.trim() === '') {
      // Auto-generate next hotel code
      const lastHotel = await Hotel.findOne({ hotelCode: /^OXY\d+$/i }).sort({ createdAt: -1 }).lean() as any;
      if (lastHotel && lastHotel.hotelCode) {
        const match = lastHotel.hotelCode.match(/^OXY(\d+)$/i);
        if (match) {
          const num = parseInt(match[1], 10);
          hotelCode = `OXY${String(num + 1).padStart(3, '0')}`;
        } else {
          hotelCode = 'OXY001';
        }
      } else {
        hotelCode = 'OXY001';
      }
    }

    const trimmedCode = hotelCode.trim().toUpperCase();
    if (trimmedCode.length < 3 || trimmedCode.length > 20) {
      throw new ApiError(400, 'Hotel Code must be between 3 and 20 characters');
    }

    if (!/^[A-Z0-9-]+$/.test(trimmedCode)) {
      throw new ApiError(400, 'Hotel Code must only contain letters, numbers, and hyphens');
    }

    const existingHotel = await Hotel.findOne({ hotelCode: new RegExp(`^${trimmedCode}$`, 'i') }).lean() as any;
    if (existingHotel) {
      throw new ApiError(400, 'Hotel Code already exists. Please use a unique code.');
    }

    const hotel = await Hotel.create({
      name,
      hotelCode: trimmedCode,
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
        details: `Hotel ${name} (${trimmedCode}) created`,
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
    const hotels = await Hotel.find().sort({ createdAt: 1 }).lean() as any;
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
    const hotel = await Hotel.findById(req.params.id).lean() as any;
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
    const existingHotel = await Hotel.findById(req.params.id).lean() as any;
    if (!existingHotel) {
      throw new ApiError(404, 'Hotel not found');
    }

    const originalHotel = existingHotel.toObject();

    const { name, hotelCode, email, phone, address, googleLocationLink, subscriptionPlan, status } = req.body;

    if (hotelCode !== undefined && hotelCode.trim() !== '') {
      const trimmedCode = hotelCode.trim().toUpperCase();
      if (trimmedCode.length < 3 || trimmedCode.length > 20) {
        throw new ApiError(400, 'Hotel Code must be between 3 and 20 characters');
      }
      if (!/^[A-Z0-9-]+$/.test(trimmedCode)) {
        throw new ApiError(400, 'Hotel Code must only contain letters, numbers, and hyphens');
      }

      const duplicateHotel = await Hotel.findOne({
              hotelCode: new RegExp(`^${trimmedCode}$`, 'i'),
              _id: { $ne: req.params.id }
            }).lean() as any;
      if (duplicateHotel) {
        throw new ApiError(400, 'Hotel Code already exists. Please use a unique code.');
      }
    }

    const oldHotelCode = existingHotel.hotelCode;
    const newHotelCode = hotelCode !== undefined ? hotelCode.trim().toUpperCase() : oldHotelCode;

    const updatedHotel = await Hotel.findByIdAndUpdate(
      req.params.id,
      {
        name,
        hotelCode: newHotelCode,
        email,
        phone,
        address,
        googleLocationLink,
        subscriptionPlan,
        status,
      },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!updatedHotel) {
      throw new ApiError(404, 'Hotel not found');
    }

    if (req.user) {
      const fieldsToTrack = [
        'name',
        'hotelCode',
        'email',
        'phone',
        'address.street',
        'address.city',
        'address.state',
        'address.zip',
        'address.country',
        'googleLocationLink',
        'status',
      ];
      
      const { oldValue, newValue, hasChanged, changedFields } = diffFields(
        originalHotel,
        updatedHotel,
        fieldsToTrack
      );

      if (hasChanged) {
        await logAuditTrail({
          userId: req.user._id,
          action: 'Property Updated',
          module: 'Property',
          oldValue,
          newValue,
          details: `Property ${updatedHotel.name} details updated: ${changedFields.join(', ')}`,
          targetId: updatedHotel._id.toString(),
          req,
        });
      }

      AuditLog.create({
        user: req.user._id,
        action: 'UPDATE_HOTEL',
        module: 'HOTEL',
        details: `Hotel ${updatedHotel.name} updated`,
      }).catch(err => console.error('Failed to create audit log:', err));

      if (oldHotelCode !== newHotelCode) {
        AuditLog.create({
          user: req.user._id,
          action: 'HOTEL_CODE_UPDATED',
          module: 'HOTEL',
          details: JSON.stringify({
            action: 'HOTEL_CODE_UPDATED',
            oldValue: oldHotelCode,
            newValue: newHotelCode,
            updatedBy: `${req.user.firstName} ${req.user.lastName}`,
            timestamp: new Date().toISOString()
          }),
        }).catch(err => console.error('Failed to create audit log:', err));
      }
    }

    res.status(200).json({
      status: 'success',
      data: { hotel: updatedHotel },
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
