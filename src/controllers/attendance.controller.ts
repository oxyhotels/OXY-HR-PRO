import { Request, Response, NextFunction } from 'express';
import { Attendance } from '@/models/Attendance';
import { ApiError } from '@/utils/ApiError';
import { User } from '@/models/User';
import { Hotel } from '@/models/Hotel';
import { createNotification } from '@/services/notification.service';
import { reverseGeocode } from '@/utils/geocoding';
import { processAttendanceStreak, processAttendanceCheckout } from '@/services/gamification.service';

// Helper to get today's date string in local time YYYY-MM-DD
const getLocalDateString = (): string => {
  const d = new Date();
  const offset = d.getTimezoneOffset();
  const localDate = new Date(d.getTime() - offset * 60 * 1000);
  return localDate.toISOString().split('T')[0];
};

// Exemption check: Root Admin, HR Department, IT Department are exempt
const isExempt = (user: any): boolean => {
  if (!user) return false;
  if (user.role === 'ROOT_ADMIN') return true;

  const dept = (user.department || '').toLowerCase();
  const role = (user.role || '').toLowerCase();

  // HR Department
  if (dept.includes('hr') || dept.includes('human resources') || role === 'hr_manager') {
    return true;
  }

  // IT Department
  if (dept.includes('it') || dept.includes('information technology') || dept.includes('it services')) {
    return true;
  }

  return false;
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

    // Geolocation and Selfie Verification Check
    const exempt = isExempt(req.user);
    const { latitude, longitude, accuracy, photo, deviceInfo, browserInfo, hotelId, deviceFingerprint, os, department } = req.body;
    const ipAddress = req.body.ipAddress || req.headers['x-forwarded-for'] || req.socket.remoteAddress || req.ip || '';

    if (!exempt) {
      if (latitude === undefined || longitude === undefined || accuracy === undefined || !photo) {
        throw new ApiError(400, 'GPS coordinates and live selfie are mandatory for attendance verification');
      }
      if (!hotelId) {
        throw new ApiError(400, 'Please select a hotel property to clock in');
      }
      if (!department) {
        throw new ApiError(400, 'Please select a department to clock in');
      }
    }

    // Validate hotel if provided
    if (hotelId) {
      const hotelExists = await Hotel.findOne({ _id: hotelId, status: 'Active' });
      if (!hotelExists) {
        throw new ApiError(404, 'Selected hotel property does not exist or is suspended');
      }
    }

    // Geocode coordinates
    let addressData: any = null;
    if (latitude !== undefined && longitude !== undefined) {
      try {
        addressData = await reverseGeocode(Number(latitude), Number(longitude));
      } catch (err: any) {
        if (!exempt) {
          throw new ApiError(400, `Address Resolution Failed: ${err.message || err}`);
        }
      }
    }

    const checkInTime = new Date();
    // Simple rule: Late if checked in after 9:15 AM
    let status: 'Present' | 'Late' = 'Present';
    if (checkInTime.getHours() > 9 || (checkInTime.getHours() === 9 && checkInTime.getMinutes() > 15)) {
      status = 'Late';
    }

    const attendance = await Attendance.create({
      employee: req.user._id,
      hotel: hotelId || req.user.hotel,
      date: todayStr,
      checkIn: checkInTime,
      status,
      department: department || req.user.department || undefined,
      // GPS & Selfie Verification fields (saved if provided or required)
      checkInLatitude: latitude !== undefined ? Number(latitude) : undefined,
      checkInLongitude: longitude !== undefined ? Number(longitude) : undefined,
      checkInAccuracy: accuracy !== undefined ? Number(accuracy) : undefined,
      checkInPhoto: photo || undefined,
      selfieUrl: photo || undefined, // legacy compat
      checkInCoordinates: (latitude !== undefined && longitude !== undefined) ? {
        lat: Number(latitude),
        lng: Number(longitude)
      } : undefined, // legacy compat
      deviceInfo: deviceInfo || undefined,
      browserInfo: browserInfo || undefined,
      ipAddress: ipAddress || undefined,
      
      // New geocoding, client-side metadata, and security audit fields
      checkInAddress: addressData?.formattedAddress || undefined,
      country: addressData?.country || undefined,
      state: addressData?.state || undefined,
      district: addressData?.district || undefined,
      city: addressData?.city || undefined,
      locality: addressData?.locality || undefined,
      village: addressData?.village || undefined,
      road: addressData?.road || undefined,
      postalCode: addressData?.postalCode || undefined,
      gpsAccuracy: accuracy !== undefined ? Number(accuracy) : undefined,
      locationSource: (accuracy !== undefined && accuracy <= 1000) ? 'GPS' : 'Network',
      deviceFingerprint: deviceFingerprint || undefined,
      browserAgent: browserInfo || undefined,
      os: os || undefined,
      gpsEnabled: (latitude !== undefined && longitude !== undefined),
      checkInSelfie: photo || undefined,
    });

    // Resolve property name for notification description
    let propertyName = 'Property';
    const finalHotelId = hotelId || req.user.hotel;
    if (finalHotelId) {
      const hotelDoc = await Hotel.findById(finalHotelId);
      if (hotelDoc) {
        propertyName = hotelDoc.name;
      }
    }

    // Trigger notification to ROOT_ADMIN
    await createNotification({
      title: 'Staff Check-In',
      message: `${req.user.firstName} ${req.user.lastName} checked in to ${propertyName} at ${checkInTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`,
      type: 'success',
      link: '/dashboard/attendance',
      recipientRole: 'ROOT_ADMIN'
    });

    // ── Gamification: award XP + streak for check-in ──
    try {
      const finalHotelForGamification = hotelId || req.user.hotel;
      if (finalHotelForGamification) {
        const isEarly = checkInTime.getHours() < 9 || (checkInTime.getHours() === 9 && checkInTime.getMinutes() === 0);
        await processAttendanceStreak(req.user._id.toString(), finalHotelForGamification.toString(), isEarly);
      }
    } catch (gamErr) {
      // Non-blocking — don't fail check-in if gamification errors
      console.warn('[Gamification] Streak processing error:', gamErr);
    }

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

    const { 
      workDescription, 
      workPictureUrl, 
      workVideoUrl,
      latitude,
      longitude,
      accuracy,
      photo,
      deviceInfo,
      browserInfo,
      deviceFingerprint,
      os
    } = req.body;

    const ipAddress = req.body.ipAddress || req.headers['x-forwarded-for'] || req.socket.remoteAddress || req.ip || '';

    if (!workDescription) {
      throw new ApiError(400, 'Work update description is compulsory for checkout');
    }

    // Geolocation and Selfie Verification Check
    const exempt = isExempt(req.user);
    if (!exempt) {
      if (latitude === undefined || longitude === undefined || accuracy === undefined || !photo) {
        throw new ApiError(400, 'GPS coordinates and live selfie are mandatory for attendance verification');
      }
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

    // Geocode coordinates on checkout
    let addressData: any = null;
    if (latitude !== undefined && longitude !== undefined) {
      try {
        addressData = await reverseGeocode(Number(latitude), Number(longitude));
      } catch (err: any) {
        if (!exempt) {
          throw new ApiError(400, `Address Resolution Failed: ${err.message || err}`);
        }
      }
    }

    const checkOutTime = new Date();
    attendance.checkOut = checkOutTime;
    attendance.workDescription = workDescription;
    if (workPictureUrl) attendance.workPictureUrl = workPictureUrl;
    if (workVideoUrl) attendance.workVideoUrl = workVideoUrl;

    // Save Verification details
    if (latitude !== undefined) attendance.checkOutLatitude = Number(latitude);
    if (longitude !== undefined) attendance.checkOutLongitude = Number(longitude);
    if (accuracy !== undefined) attendance.checkOutAccuracy = Number(accuracy);
    if (photo) attendance.checkOutPhoto = photo;
    if (latitude !== undefined && longitude !== undefined) {
      attendance.checkOutCoordinates = {
        lat: Number(latitude),
        lng: Number(longitude)
      };
    }
    if (deviceInfo) attendance.deviceInfo = deviceInfo;
    if (browserInfo) attendance.browserInfo = browserInfo;
    if (ipAddress) attendance.ipAddress = ipAddress;

    // Save checkout geocoding and security metadata
    attendance.checkOutAddress = addressData?.formattedAddress || undefined;
    attendance.checkOutCountry = addressData?.country || undefined;
    attendance.checkOutState = addressData?.state || undefined;
    attendance.checkOutDistrict = addressData?.district || undefined;
    attendance.checkOutCity = addressData?.city || undefined;
    attendance.checkOutVillage = addressData?.village || undefined;
    attendance.checkOutLocality = addressData?.locality || undefined;
    attendance.checkOutSelfie = photo || undefined;
    
    attendance.gpsAccuracy = accuracy !== undefined ? Number(accuracy) : attendance.gpsAccuracy;
    attendance.locationSource = (accuracy !== undefined && accuracy <= 1000) ? 'GPS' : 'Network';
    attendance.deviceFingerprint = deviceFingerprint || attendance.deviceFingerprint;
    attendance.browserAgent = browserInfo || attendance.browserAgent;
    attendance.os = os || attendance.os;
    attendance.gpsEnabled = (latitude !== undefined && longitude !== undefined);

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

    const finalHotelForGamification = req.user.hotel || attendance.hotel;
    if (finalHotelForGamification) {
      await processAttendanceCheckout(
        req.user._id.toString(),
        finalHotelForGamification.toString(),
        attendance.status || 'Present'
      );
    }

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

    // Employee Check
    if (req.query.employeeId) {
      filter.employee = req.query.employeeId;
    }

    // Date filtering: optional if query parameter "all" is true
    if (req.query.all === 'true') {
      // Fetch historical records
    } else if (req.query.date) {
      filter.date = req.query.date;
    } else {
      filter.date = getLocalDateString();
    }

    const queryBuilder = Attendance.find(filter)
      .populate('employee', 'firstName lastName email department designation aadhaarNumber panNumber shift photoUrl role')
      .populate('hotel', 'name hotelCode')
      .sort({ date: -1 });

    if (req.query.all === 'true' && !req.query.employeeId) {
      queryBuilder.limit(100);
    }

    const logs = await queryBuilder;

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

export const getLiveAttendance = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const filter: any = {};
    
    // Tenancy Check
    if (req.user?.role !== 'ROOT_ADMIN') {
      filter.hotel = req.user?.hotel;
    } else if (req.query.hotelId) {
      filter.hotel = req.query.hotelId;
    }

    if (req.query.employeeId) {
      filter.employee = req.query.employeeId;
    }

    if (req.query.date) {
      filter.date = req.query.date;
    } else {
      filter.date = getLocalDateString();
    }

    const logs = await Attendance.find(filter)
      .populate('employee', 'firstName lastName email department designation role photoUrl')
      .populate('hotel', 'name hotelCode')
      .sort({ checkIn: -1 });

    res.status(200).json({
      status: 'success',
      results: logs.length,
      data: { logs },
    });
  } catch (error) {
    next(error);
  }
};

export const getLocationHistory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const filter: any = {
      $or: [
        { checkInLatitude: { $exists: true } },
        { checkOutLatitude: { $exists: true } }
      ]
    };

    if (req.user?.role !== 'ROOT_ADMIN') {
      filter.hotel = req.user?.hotel;
    } else if (req.query.hotelId) {
      filter.hotel = req.query.hotelId;
    }

    if (req.query.employeeId) {
      filter.employee = req.query.employeeId;
    }

    if (req.query.date) {
      filter.date = req.query.date;
    }

    const logs = await Attendance.find(filter)
      .populate('employee', 'firstName lastName email department designation role photoUrl')
      .populate('hotel', 'name hotelCode')
      .sort({ date: -1, checkIn: -1 });

    res.status(200).json({
      status: 'success',
      results: logs.length,
      data: { logs },
    });
  } catch (error) {
    next(error);
  }
};

export const getAddressVerification = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { latitude, longitude } = req.query;
    if (!latitude || !longitude) {
      throw new ApiError(400, 'latitude and longitude are required parameters.');
    }

    const addressData = await reverseGeocode(Number(latitude), Number(longitude));
    res.status(200).json({
      status: 'success',
      data: addressData,
    });
  } catch (error) {
    next(error);
  }
};
