import { Request, Response, NextFunction } from 'express';
import { Attendance } from '@/models/Attendance';
import { ApiError } from '@/utils/ApiError';
import { User } from '@/models/User';

// Helper to get today's date string in local time YYYY-MM-DD
const getLocalDateString = (): string => {
  const d = new Date();
  const offset = d.getTimezoneOffset();
  const localDate = new Date(d.getTime() - offset * 60 * 1000);
  return localDate.toISOString().split('T')[0];
};

export const checkIn = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) throw new ApiError(401, 'Unauthorized');

    const todayStr = getLocalDateString();

    // Check if already checked in today
    const existing = await Attendance.findOne({
      employee: req.user._id,
      date: todayStr,
    });

    if (existing) {
      throw new ApiError(400, 'You have already checked in for today');
    }

    const checkInTime = new Date();
    // Simple rule: Late if checked in after 9:15 AM
    let status: 'Present' | 'Late' = 'Present';
    if (checkInTime.getHours() > 9 || (checkInTime.getHours() === 9 && checkInTime.getMinutes() > 15)) {
      status = 'Late';
    }

    const attendance = await Attendance.create({
      employee: req.user._id,
      hotel: req.user.hotel,
      date: todayStr,
      checkIn: checkInTime,
      status,
    });

    res.status(201).json({
      status: 'success',
      data: { attendance },
    });
  } catch (error) {
    next(error);
  }
};

export const checkOut = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) throw new ApiError(401, 'Unauthorized');

    const { workDescription, workPictureUrl, workVideoUrl } = req.body;
    if (!workDescription) {
      throw new ApiError(400, 'Work update description is compulsory for checkout');
    }

    const todayStr = getLocalDateString();

    const attendance = await Attendance.findOne({
      employee: req.user._id,
      date: todayStr,
    });

    if (!attendance) {
      throw new ApiError(400, 'No check-in record found for today');
    }

    if (attendance.checkOut) {
      throw new ApiError(400, 'You have already checked out for today');
    }

    const checkOutTime = new Date();
    attendance.checkOut = checkOutTime;
    attendance.workDescription = workDescription;
    if (workPictureUrl) attendance.workPictureUrl = workPictureUrl;
    if (workVideoUrl) attendance.workVideoUrl = workVideoUrl;

    // Ensure all active breaks are ended
    attendance.breaks.forEach((b: any) => {
      if (!b.end) {
        b.end = checkOutTime;
      }
    });

    // Calculate total break minutes
    let breakMs = 0;
    attendance.breaks.forEach((b: any) => {
      if (b.end) {
        breakMs += b.end.getTime() - b.start.getTime();
      }
    });
    const totalBreakMinutes = Math.round(breakMs / 60000);
    attendance.totalBreakMinutes = totalBreakMinutes;

    // Calculate total working hours
    const totalDurationMs = checkOutTime.getTime() - attendance.checkIn.getTime();
    const workingMs = totalDurationMs - breakMs;
    const totalWorkingHours = Math.max(0, parseFloat((workingMs / 3600000).toFixed(2)));
    attendance.totalWorkingHours = totalWorkingHours;

    // If working hours are less than 4, mark as Half-Day
    if (totalWorkingHours < 4 && attendance.status !== 'Late') {
      attendance.status = 'Half-Day';
    }

    await attendance.save();

    res.status(200).json({
      status: 'success',
      data: { attendance },
    });
  } catch (error) {
    next(error);
  }
};

export const startBreak = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) throw new ApiError(401, 'Unauthorized');

    const todayStr = getLocalDateString();
    const attendance = await Attendance.findOne({
      employee: req.user._id,
      date: todayStr,
    });

    if (!attendance) {
      throw new ApiError(400, 'Please check in first before starting a break');
    }

    if (attendance.checkOut) {
      throw new ApiError(400, 'You have already checked out for today');
    }

    // Check if there is an active break (no end time)
    const activeBreak = attendance.breaks.find((b: any) => !b.end);
    if (activeBreak) {
      throw new ApiError(400, 'You are already on an active break');
    }

    attendance.breaks.push({ start: new Date() });
    await attendance.save();

    res.status(200).json({
      status: 'success',
      data: { attendance },
    });
  } catch (error) {
    next(error);
  }
};

export const endBreak = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) throw new ApiError(401, 'Unauthorized');

    const todayStr = getLocalDateString();
    const attendance = await Attendance.findOne({
      employee: req.user._id,
      date: todayStr,
    });

    if (!attendance) {
      throw new ApiError(400, 'No attendance record found');
    }

    const activeBreak = attendance.breaks.find((b: any) => !b.end);
    if (!activeBreak) {
      throw new ApiError(400, 'No active break found to end');
    }

    activeBreak.end = new Date();

    // Recompute total break minutes
    let breakMs = 0;
    attendance.breaks.forEach((b: any) => {
      if (b.end) {
        breakMs += b.end.getTime() - b.start.getTime();
      }
    });
    attendance.totalBreakMinutes = Math.round(breakMs / 60000);

    await attendance.save();

    res.status(200).json({
      status: 'success',
      data: { attendance },
    });
  } catch (error) {
    next(error);
  }
};

export const getMyAttendance = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) throw new ApiError(401, 'Unauthorized');

    const filter: any = { employee: req.user._id };
    
    if (req.query.month) {
      // month format "YYYY-MM"
      filter.date = new RegExp(`^${req.query.month}`);
    }

    const logs = await Attendance.find(filter).sort({ date: -1 });

    res.status(200).json({
      status: 'success',
      results: logs.length,
      data: { logs },
    });
  } catch (error) {
    next(error);
  }
};

export const getHotelAttendance = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const filter: any = {};

    // Tenancy Check
    if (req.user?.role !== 'ROOT_ADMIN') {
      filter.hotel = req.user?.hotel;
    } else if (req.query.hotelId) {
      filter.hotel = req.query.hotelId;
    }

    // Date filtering: optional if query parameter "all" is true
    if (req.query.all === 'true') {
      // Fetch all historical records
    } else if (req.query.date) {
      filter.date = req.query.date;
    } else {
      filter.date = getLocalDateString();
    }

    const logs = await Attendance.find(filter)
      .populate('employee', 'firstName lastName email department designation aadhaarNumber panNumber')
      .populate('hotel', 'name code')
      .sort({ date: -1 });

    // Fetch all Managers (HOTEL_ADMIN) to map them to hotels in-memory
    const managers = await User.find({ role: 'HOTEL_ADMIN' }).select('firstName lastName email phone hotel');
    const managerMap: any = {};
    managers.forEach((m) => {
      if (m.hotel) {
        managerMap[m.hotel.toString()] = {
          id: m._id,
          name: `${m.firstName} ${m.lastName}`,
          email: m.email,
          phone: m.phone,
        };
      }
    });

    // Attach manager details to attendance logs
    const logsJson = logs.map(log => {
      const obj = log.toObject() as any;
      const hotelId = obj.hotel?._id?.toString() || obj.hotel?.toString();
      obj.manager = managerMap[hotelId] || null;
      return obj;
    });

    res.status(200).json({
      status: 'success',
      results: logsJson.length,
      data: { logs: logsJson },
    });
  } catch (error) {
    next(error);
  }
};
