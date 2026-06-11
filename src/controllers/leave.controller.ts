import { Request, Response, NextFunction } from 'express';
import { Leave } from '@/models/Leave';
import { ApiError } from '@/utils/ApiError';
import { AuditLog } from '@/models/AuditLog';

export const requestLeave = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { leaveType, startDate, endDate, reason } = req.body;

    if (!req.user) throw new ApiError(401, 'Unauthorized');

    const leave = await Leave.create({
      employee: req.user._id,
      hotel: req.user.hotel,
      leaveType,
      startDate,
      endDate,
      reason,
      status: 'Pending',
    });

    await AuditLog.create({
      user: req.user._id,
      hotel: req.user.hotel,
      action: 'LEAVE_REQUEST',
      module: 'LEAVE',
      details: `Leave requested from ${startDate} to ${endDate} for reason: ${reason}`,
    });

    res.status(201).json({
      status: 'success',
      data: { leave },
    });
  } catch (error) {
    next(error);
  }
};

export const getLeaves = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const filter: any = {};

    // Tenancy Check
    if (req.user?.role !== 'ROOT_ADMIN') {
      filter.hotel = req.user?.hotel;
    } else if (req.query.hotelId) {
      filter.hotel = req.query.hotelId;
    }

    // Role restrictions: Employees can only view their own leave logs
    if (req.user?.role === 'EMPLOYEE') {
      filter.employee = req.user._id;
    } else if (req.query.employeeId) {
      filter.employee = req.query.employeeId;
    }

    if (req.query.status) {
      filter.status = req.query.status;
    }

    const leaves = await Leave.find(filter)
      .populate('employee', 'firstName lastName email department designation')
      .populate('approvedBy', 'firstName lastName email')
      .sort({ createdAt: -1 });

    res.status(200).json({
      status: 'success',
      results: leaves.length,
      data: { leaves },
    });
  } catch (error) {
    next(error);
  }
};

export const approveRejectLeave = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { status, comments } = req.body; // status must be 'Approved' or 'Rejected'
    
    if (status !== 'Approved' && status !== 'Rejected') {
      throw new ApiError(400, 'Status must be Approved or Rejected');
    }

    const leave = await Leave.findById(req.params.id);
    if (!leave) throw new ApiError(404, 'Leave request not found');

    // Tenancy check
    if (req.user?.role !== 'ROOT_ADMIN' && leave.hotel.toString() !== req.user?.hotel?.toString()) {
      throw new ApiError(403, 'Unauthorized');
    }

    leave.status = status;
    leave.approvedBy = req.user?._id as any;
    leave.comments = comments;
    await leave.save();

    await AuditLog.create({
      user: req.user?._id,
      hotel: leave.hotel,
      action: `LEAVE_${status.toUpperCase()}`,
      module: 'LEAVE',
      details: `Leave request for employee ID ${leave.employee} marked as ${status}. Comments: ${comments || 'none'}`,
    });

    res.status(200).json({
      status: 'success',
      data: { leave },
    });
  } catch (error) {
    next(error);
  }
};

export const getLeaveStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const filter: any = {};
    if (req.user?.role !== 'ROOT_ADMIN') {
      filter.hotel = req.user?.hotel;
    } else if (req.query.hotelId) {
      filter.hotel = req.query.hotelId;
    }

    const stats = await Leave.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    res.status(200).json({
      status: 'success',
      data: { stats },
    });
  } catch (error) {
    next(error);
  }
};
