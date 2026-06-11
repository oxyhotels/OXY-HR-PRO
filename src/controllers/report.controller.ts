import { Request, Response, NextFunction } from 'express';
import { User } from '@/models/User';
import { Attendance } from '@/models/Attendance';
import { Leave } from '@/models/Leave';
import { Task } from '@/models/Task';
import { Payroll } from '@/models/Payroll';
import { Hotel } from '@/models/Hotel';
import { ApiError } from '@/utils/ApiError';

export const getDashboardStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    let hotelId = req.user?.hotel;
    if (req.user?.role === 'ROOT_ADMIN') {
      hotelId = req.query.hotelId as any; // Allow Root Admin to filter by hotel query
    }

    const todayStr = new Date().toISOString().split('T')[0];

    // Build tenancy filters
    const userFilter: any = { status: 'Active' };
    const attendanceFilter: any = { date: todayStr };
    const leaveFilter: any = { status: 'Pending' };
    const taskFilter: any = { status: { $ne: 'Completed' } };

    if (hotelId) {
      userFilter.hotel = hotelId;
      attendanceFilter.hotel = hotelId;
      leaveFilter.hotel = hotelId;
      taskFilter.hotel = hotelId;
    } else if (req.user?.role !== 'ROOT_ADMIN') {
      // Security fallback
      userFilter.hotel = req.user?.hotel;
      attendanceFilter.hotel = req.user?.hotel;
      leaveFilter.hotel = req.user?.hotel;
      taskFilter.hotel = req.user?.hotel;
    }

    // Run parallel queries for speed
    const [
      totalEmployees,
      attendanceToday,
      pendingLeaves,
      pendingTasks,
      departmentBreakdown,
    ] = await Promise.all([
      User.countDocuments(userFilter),
      Attendance.countDocuments(attendanceFilter),
      Leave.countDocuments(leaveFilter),
      Task.countDocuments(taskFilter),
      User.aggregate([
        { $match: userFilter },
        { $group: { _id: '$department', count: { $sum: 1 } } },
      ]),
    ]);

    // Simple attendance rate
    const attendanceRate = totalEmployees > 0 ? Math.round((attendanceToday / totalEmployees) * 100) : 0;

    res.status(200).json({
      status: 'success',
      data: {
        stats: {
          totalEmployees,
          attendanceRate,
          pendingLeaves,
          pendingTasks,
        },
        departmentBreakdown,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getAttendanceReport = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { month } = req.query; // format "YYYY-MM"
    if (!month) throw new ApiError(400, 'Month YYYY-MM is required');

    let hotelId = req.user?.hotel;
    if (req.user?.role === 'ROOT_ADMIN') {
      hotelId = req.query.hotelId as any;
    }

    const filter: any = { date: new RegExp(`^${month}`) };
    if (hotelId) {
      filter.hotel = hotelId;
    }

    const logs = await Attendance.aggregate([
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
      data: { logs },
    });
  } catch (error) {
    next(error);
  }
};

export const getPayrollReport = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    let hotelId = req.user?.hotel;
    if (req.user?.role === 'ROOT_ADMIN') {
      hotelId = req.query.hotelId as any;
    }

    const filter: any = { status: 'Paid' };
    if (hotelId) {
      filter.hotel = hotelId;
    }

    // Summarize total expenses over the last 6 months
    const report = await Payroll.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$month',
          totalPayout: { $sum: '$netSalary' },
          totalOvertime: { $sum: '$overtimePay' },
          totalBonus: { $sum: '$bonus' },
        },
      },
      { $sort: { _id: 1 } },
      { $limit: 6 },
    ]);

    res.status(200).json({
      status: 'success',
      data: { report },
    });
  } catch (error) {
    next(error);
  }
};

export const getHotelPerformance = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Only Root Admin can compare multi-hotel metrics
    if (req.user?.role !== 'ROOT_ADMIN') {
      throw new ApiError(403, 'Permission denied');
    }

    const hotels = await Hotel.find({ status: 'Active' });
    const performanceData = [];

    for (const hotel of hotels) {
      const staffCount = await User.countDocuments({ hotel: hotel._id, status: 'Active' });
      const unpaidLeaves = await Leave.countDocuments({ hotel: hotel._id, status: 'Pending' });

      // Calculate recent month expenses
      const recentMonth = new Date().toISOString().substring(0, 7); // current YYYY-MM
      const payrollSum = await Payroll.aggregate([
        { $match: { hotel: hotel._id, month: recentMonth, status: 'Paid' } },
        { $group: { _id: null, total: { $sum: '$netSalary' } } },
      ]);

      performanceData.push({
        hotelName: hotel.name,
        code: hotel.code,
        staffCount,
        unpaidLeaves,
        monthlyPayrollExpense: payrollSum[0]?.total || 0,
      });
    }

    res.status(200).json({
      status: 'success',
      data: { performanceData },
    });
  } catch (error) {
    next(error);
  }
};
