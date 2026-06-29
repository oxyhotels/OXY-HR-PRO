import { Request, Response, NextFunction } from 'express';
import { TrackingSession } from '@/models/TrackingSession';
import { TrackingLocation } from '@/models/TrackingLocation';
import { Attendance } from '@/models/Attendance';
import { User } from '@/models/User';
import { ApiError } from '@/utils/ApiError';

// Start tracking session on Work In
export const startTrackingSession = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { attendanceId, latitude, longitude, accuracy, address, photo, ...addressParts } = req.body;
    const userId = (req as any).user._id;

    // Get employee details
    const employee = await User.findById(userId);
    if (!employee) {
      throw new ApiError(404, 'Employee not found');
    }

    // Get attendance record
    const attendance = await Attendance.findById(attendanceId);
    if (!attendance) {
      throw new ApiError(404, 'Attendance record not found');
    }

    // Create tracking session
    const session = await TrackingSession.create({
      employee: userId,
      hotel: employee.hotel,
      attendance: attendanceId,
      department: employee.department,
      role: employee.role,
      startTime: new Date(),
      isActive: true,
      checkInLatitude: latitude,
      checkInLongitude: longitude,
      checkInAccuracy: accuracy,
      checkInAddress: address,
      checkInPhoto: photo,
      checkInCountry: addressParts.country,
      checkInState: addressParts.state,
      checkInDistrict: addressParts.district,
      checkInCity: addressParts.city,
      checkInLocality: addressParts.locality,
      checkInVillage: addressParts.village,
      checkInPostalCode: addressParts.postalCode,
    });

    // Update attendance with check-in tracking data
    attendance.checkInLatitude = latitude;
    attendance.checkInLongitude = longitude;
    attendance.checkInAccuracy = accuracy;
    attendance.checkInAddress = address;
    attendance.checkInPhoto = photo;
    if (addressParts.country) attendance.country = addressParts.country;
    if (addressParts.state) attendance.state = addressParts.state;
    if (addressParts.district) attendance.district = addressParts.district;
    if (addressParts.city) attendance.city = addressParts.city;
    if (addressParts.locality) attendance.locality = addressParts.locality;
    if (addressParts.village) attendance.village = addressParts.village;
    if (addressParts.postalCode) attendance.postalCode = addressParts.postalCode;
    await attendance.save();

    res.status(201).json({
      status: 'success',
      data: { session },
    });
  } catch (error) {
    next(error);
  }
};

// Add location update during active session
export const addLocationUpdate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { sessionId, latitude, longitude, accuracy, address, ...addressParts } = req.body;
    const userId = (req as any).user._id;

    // Find active session
    const session = await TrackingSession.findOne({ _id: sessionId, employee: userId, isActive: true });
    if (!session) {
      throw new ApiError(404, 'Active tracking session not found');
    }

    // Create location record
    const location = await TrackingLocation.create({
      session: sessionId,
      employee: userId,
      hotel: session.hotel,
      latitude,
      longitude,
      accuracy,
      address,
      country: addressParts.country,
      state: addressParts.state,
      district: addressParts.district,
      city: addressParts.city,
      locality: addressParts.locality,
      village: addressParts.village,
      postalCode: addressParts.postalCode,
      timestamp: new Date(),
    });

    // Update session stats
    session.locationUpdateCount += 1;
    
    // Calculate distance from last location (simple Haversine approximation)
    const lastLocation = await TrackingLocation.findOne({ session: sessionId })
          .sort({ timestamp: -1 })
          .skip(1);
    
    if (lastLocation) {
      const distance = calculateDistance(lastLocation.latitude, lastLocation.longitude, latitude, longitude);
      session.totalDistance += distance;
    }
    
    await session.save();

    res.status(201).json({
      status: 'success',
      data: { location },
    });
  } catch (error) {
    next(error);
  }
};

// End tracking session on Work Out
export const endTrackingSession = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { sessionId, latitude, longitude, accuracy, address, photo, ...addressParts } = req.body;
    const userId = (req as any).user._id;

    // Find and update session
    const session = await TrackingSession.findOne({ _id: sessionId, employee: userId, isActive: true });
    if (!session) {
      throw new ApiError(404, 'Active tracking session not found');
    }

    session.endTime = new Date();
    session.isActive = false;
    session.checkOutLatitude = latitude;
    session.checkOutLongitude = longitude;
    session.checkOutAccuracy = accuracy;
    session.checkOutAddress = address;
    session.checkOutPhoto = photo;
    session.checkOutCountry = addressParts.country;
    session.checkOutState = addressParts.state;
    session.checkOutDistrict = addressParts.district;
    session.checkOutCity = addressParts.city;
    session.checkOutLocality = addressParts.locality;
    session.checkOutVillage = addressParts.village;
    session.checkOutPostalCode = addressParts.postalCode;
    await session.save();

    // Update attendance with check-out data
    const attendance = await Attendance.findById(session.attendance);
    if (attendance) {
      attendance.checkOutLatitude = latitude;
      attendance.checkOutLongitude = longitude;
      attendance.checkOutAccuracy = accuracy;
      attendance.checkOutAddress = address;
      attendance.checkOutPhoto = photo;
      if (addressParts.country) attendance.checkOutCountry = addressParts.country;
      if (addressParts.state) attendance.checkOutState = addressParts.state;
      if (addressParts.district) attendance.checkOutDistrict = addressParts.district;
      if (addressParts.city) attendance.checkOutCity = addressParts.city;
      if (addressParts.locality) attendance.checkOutLocality = addressParts.locality;
      if (addressParts.village) attendance.checkOutVillage = addressParts.village;
      if (addressParts.postalCode) attendance.checkOutPostalCode = addressParts.postalCode;
      await attendance.save();
    }

    res.status(200).json({
      status: 'success',
      data: { session },
    });
  } catch (error) {
    next(error);
  }
};

// Get active tracking sessions (for Root Admin/Manager)
export const getActiveSessions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { hotelId, department } = req.query;
    const userId = (req as any).user._id;
    const user = await User.findById(userId);

    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    // Build filter
    const filter: any = { isActive: true };
    
    // Root Admin can see all, Manager sees only their department/employees
    if (user.role === 'ROOT_ADMIN' || user.role === 'HOTEL_ADMIN') {
      if (hotelId) filter.hotel = hotelId;
      if (department) filter.department = department;
    } else if (user.role === 'DEPT_MANAGER' || user.role === 'HR_MANAGER') {
      // Managers see only their department
      filter.department = user.department;
      if (hotelId) filter.hotel = hotelId;
    } else {
      throw new ApiError(403, 'Access denied');
    }

    const sessions = await TrackingSession.find(filter)
          .populate('employee', 'firstName lastName email department designation photoUrl role')
          .populate('hotel', 'name hotelCode')
          .sort({ startTime: -1 });

    res.status(200).json({
      status: 'success',
      data: { sessions },
    });
  } catch (error) {
    next(error);
  }
};

// Get employee tracking history
export const getEmployeeTrackingHistory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { employeeId, startDate, endDate } = req.query;
    const userId = (req as any).user._id;
    const user = await User.findById(userId);

    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    // Build filter
    const filter: any = {};
    
    if (employeeId) {
      // Managers can only view their subordinates
      if (user.role === 'DEPT_MANAGER' || user.role === 'HR_MANAGER') {
        // TODO: Add hierarchy check here
      }
      filter.employee = employeeId;
    } else {
      filter.employee = userId; // Own history
    }

    if (startDate || endDate) {
      filter.startTime = {};
      if (startDate) filter.startTime.$gte = new Date(startDate as string);
      if (endDate) filter.startTime.$lte = new Date(endDate as string);
    }

    const sessions = await TrackingSession.find(filter)
          .populate('employee', 'firstName lastName email department designation')
          .populate('hotel', 'name hotelCode')
          .sort({ startTime: -1 })
          .limit(30);

    res.status(200).json({
      status: 'success',
      data: { sessions },
    });
  } catch (error) {
    next(error);
  }
};

// Get location history for a session
export const getSessionLocations = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { sessionId } = req.params;
    const userId = (req as any).user._id;

    const session = await TrackingSession.findById(sessionId);
    if (!session) {
      throw new ApiError(404, 'Session not found');
    }

    // Check access
    const user = await User.findById(userId);
    if (user?.role !== 'ROOT_ADMIN' && user?.role !== 'HOTEL_ADMIN' && session.employee.toString() !== userId) {
      throw new ApiError(403, 'Access denied');
    }

    const locations = await TrackingLocation.find({ session: sessionId })
          .sort({ timestamp: 1 });

    res.status(200).json({
      status: 'success',
      data: { locations },
    });
  } catch (error) {
    next(error);
  }
};

// Haversine distance calculation (in km)
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}