import { Request, Response, NextFunction } from 'express';
import { ComplianceLog } from '@/models/ComplianceLog';
import { ApiError } from '@/utils/ApiError';

export const getComplianceLogs = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const filter: any = {};
    if (req.user?.role !== 'ROOT_ADMIN') {
      filter.hotel = req.user?.hotel;
    } else if (req.query.hotelId) {
      filter.hotel = req.query.hotelId;
    }

    if (req.query.type) {
      filter.type = req.query.type;
    }

    const logs = await ComplianceLog.find(filter)
      .populate('verifiedBy', 'firstName lastName email')
      .populate('hotel', 'name code')
      .sort({ date: -1 });

    res.status(200).json({
      status: 'success',
      results: logs.length,
      data: { logs },
    });
  } catch (error) {
    next(error);
  }
};

export const createComplianceLog = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { type, checklist, notes, fileUrl } = req.body;
    
    let hotelId = req.user?.hotel;
    if (req.user?.role === 'ROOT_ADMIN') {
      hotelId = req.body.hotelId;
      if (!hotelId) {
        throw new ApiError(400, 'Hotel ID is required for ROOT_ADMIN');
      }
    }

    if (!hotelId) {
      throw new ApiError(400, 'Could not resolve hotel ID');
    }

    const log = await ComplianceLog.create({
      hotel: hotelId,
      type,
      verifiedBy: req.user?._id,
      checklist: checklist || [],
      notes,
      fileUrl,
      date: new Date(),
    });

    res.status(201).json({
      status: 'success',
      data: { log },
    });
  } catch (error) {
    next(error);
  }
};
