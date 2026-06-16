import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { formatRole } from '@/lib/utils';
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
        code: hotel.hotelCode,
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

export const getAttendanceReportLogs = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { employeeId, department, role, hotelId, startDate, endDate, search } = req.query;
    const page = parseInt(req.query.page as string || '1', 10);
    const limit = parseInt(req.query.limit as string || '10', 10);

    const userQuery: any = { status: 'Active' };

    const currentUser = req.user;
    if (!currentUser) throw new ApiError(401, 'Unauthorized');

    // Scope down userQuery based on tenancy and role
    if (currentUser.role !== 'ROOT_ADMIN') {
      if (['HOTEL_ADMIN', 'HR_MANAGER', 'DEPT_MANAGER'].includes(currentUser.role || '')) {
        userQuery.hotel = currentUser.hotel;
      } else {
        userQuery._id = currentUser._id;
      }
    }

    // Apply filters from query
    if (employeeId) {
      userQuery._id = employeeId;
    }
    if (hotelId && req.user?.role === 'ROOT_ADMIN') {
      userQuery.hotel = hotelId;
    }
    if (department) {
      userQuery.department = department;
    }
    if (role) {
      userQuery.role = role;
    }
    if (search) {
      const searchRegex = new RegExp(search as string, 'i');
      userQuery.$or = [
        { firstName: searchRegex },
        { lastName: searchRegex },
        { employeeId: searchRegex }
      ];
    }

    const matchingUsers = await User.find(userQuery).select('_id');
    const employeeIds = matchingUsers.map(u => u._id);

    if (employeeIds.length === 0) {
      res.status(200).json({
        status: 'success',
        data: { logs: [], total: 0, page, limit }
      });
      return;
    }

    const attendanceQuery: any = { employee: { $in: employeeIds } };

    if (startDate || endDate) {
      attendanceQuery.date = {};
      if (startDate) attendanceQuery.date.$gte = startDate as string;
      if (endDate) attendanceQuery.date.$lte = endDate as string;
    }

    if (currentUser.role !== 'ROOT_ADMIN' && ['HOTEL_ADMIN', 'HR_MANAGER', 'DEPT_MANAGER'].includes(currentUser.role || '')) {
      attendanceQuery.hotel = currentUser.hotel;
    } else if (hotelId && currentUser.role === 'ROOT_ADMIN') {
      attendanceQuery.hotel = hotelId;
    }

    const logs = await Attendance.find(attendanceQuery)
      .populate('employee', 'firstName lastName email employeeId department designation role shift photoUrl phone joinedDate status personalDetails')
      .populate('hotel', 'name hotelCode')
      .sort({ date: -1, checkIn: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await Attendance.countDocuments(attendanceQuery);

    res.status(200).json({
      status: 'success',
      data: { logs, total, page, limit }
    });
  } catch (error) {
    next(error);
  }
};

export const getAttendanceExportData = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { employeeId, department, role, hotelId, startDate, endDate, search } = req.query;

    const userQuery: any = { status: 'Active' };

    const currentUser = req.user;
    if (!currentUser) throw new ApiError(401, 'Unauthorized');

    if (currentUser.role !== 'ROOT_ADMIN') {
      if (['HOTEL_ADMIN', 'HR_MANAGER', 'DEPT_MANAGER'].includes(currentUser.role || '')) {
        userQuery.hotel = currentUser.hotel;
      } else {
        userQuery._id = currentUser._id;
      }
    }

    if (employeeId) {
      userQuery._id = employeeId;
    }
    if (hotelId && currentUser.role === 'ROOT_ADMIN') {
      userQuery.hotel = hotelId;
    }
    if (department) {
      userQuery.department = department;
    }
    if (role) {
      userQuery.role = role;
    }
    if (search) {
      const searchRegex = new RegExp(search as string, 'i');
      userQuery.$or = [
        { firstName: searchRegex },
        { lastName: searchRegex },
        { employeeId: searchRegex }
      ];
    }

    const matchingUsers = await User.find(userQuery).select('_id');
    const employeeIds = matchingUsers.map(u => u._id);

    if (employeeIds.length === 0) {
      res.status(200).json({
        status: 'success',
        data: { logs: [] }
      });
      return;
    }

    const attendanceQuery: any = { employee: { $in: employeeIds } };

    if (startDate || endDate) {
      attendanceQuery.date = {};
      if (startDate) attendanceQuery.date.$gte = startDate as string;
      if (endDate) attendanceQuery.date.$lte = endDate as string;
    }

    if (currentUser.role !== 'ROOT_ADMIN' && ['HOTEL_ADMIN', 'HR_MANAGER', 'DEPT_MANAGER'].includes(currentUser.role || '')) {
      attendanceQuery.hotel = currentUser.hotel;
    } else if (hotelId && currentUser.role === 'ROOT_ADMIN') {
      attendanceQuery.hotel = hotelId;
    }

    const logs = await Attendance.find(attendanceQuery)
      .populate('employee', 'firstName lastName email employeeId department designation role shift photoUrl phone joinedDate status personalDetails')
      .populate('hotel', 'name hotelCode')
      .sort({ date: -1, checkIn: -1 });

    res.status(200).json({
      status: 'success',
      data: { logs }
    });
  } catch (error) {
    next(error);
  }
};

export const getWorkLogsExportData = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { employeeId, department, role, hotelId, startDate, endDate, search } = req.query;

    const userQuery: any = { status: 'Active' };

    const currentUser = req.user;
    if (!currentUser) throw new ApiError(401, 'Unauthorized');

    if (currentUser.role !== 'ROOT_ADMIN') {
      if (['HOTEL_ADMIN', 'HR_MANAGER', 'DEPT_MANAGER'].includes(currentUser.role || '')) {
        userQuery.hotel = currentUser.hotel;
      } else {
        userQuery._id = currentUser._id;
      }
    }

    if (employeeId) {
      userQuery._id = employeeId;
    }
    if (hotelId && currentUser.role === 'ROOT_ADMIN') {
      userQuery.hotel = hotelId;
    }
    if (department) {
      userQuery.department = department;
    }
    if (role) {
      userQuery.role = role;
    }
    if (search) {
      const searchRegex = new RegExp(search as string, 'i');
      userQuery.$or = [
        { firstName: searchRegex },
        { lastName: searchRegex },
        { employeeId: searchRegex }
      ];
    }

    const matchingUsers = await User.find(userQuery).select('_id');
    const employeeIds = matchingUsers.map(u => u._id);

    if (employeeIds.length === 0) {
      res.status(200).json({
        status: 'success',
        data: { logs: [] }
      });
      return;
    }

    const worklogsQuery: any = { 
      employee: { $in: employeeIds },
      checkOut: { $exists: true },
      workDescription: { $exists: true, $ne: '' }
    };

    if (startDate || endDate) {
      worklogsQuery.date = {};
      if (startDate) worklogsQuery.date.$gte = startDate as string;
      if (endDate) worklogsQuery.date.$lte = endDate as string;
    }

    if (currentUser.role !== 'ROOT_ADMIN' && ['HOTEL_ADMIN', 'HR_MANAGER', 'DEPT_MANAGER'].includes(currentUser.role || '')) {
      worklogsQuery.hotel = currentUser.hotel;
    } else if (hotelId && currentUser.role === 'ROOT_ADMIN') {
      worklogsQuery.hotel = hotelId;
    }

    const logs = await Attendance.find(worklogsQuery)
      .populate('employee', 'firstName lastName email employeeId department designation role shift photoUrl phone joinedDate status personalDetails')
      .populate('hotel', 'name hotelCode')
      .sort({ date: -1, checkIn: -1 });

    res.status(200).json({
      status: 'success',
      data: { logs }
    });
  } catch (error) {
    next(error);
  }
};

export const getEmployeeReport = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const targetEmployeeId = req.params.id;

    const currentUser = req.user;
    if (!currentUser) throw new ApiError(401, 'Unauthorized');

    // Tenancy authorization check
    if (currentUser.role !== 'ROOT_ADMIN') {
      if (['HOTEL_ADMIN', 'HR_MANAGER', 'DEPT_MANAGER'].includes(currentUser.role || '')) {
        const targetUser = await User.findById(targetEmployeeId);
        if (!targetUser || targetUser.hotel?.toString() !== currentUser.hotel?.toString()) {
          throw new ApiError(403, 'Permission denied to view this employee report');
        }
      } else {
        if (currentUser._id.toString() !== targetEmployeeId) {
          throw new ApiError(403, 'Permission denied');
        }
      }
    }

    const targetUser = await User.findById(targetEmployeeId)
      .populate('hotel', 'name hotelCode');
    if (!targetUser) throw new ApiError(404, 'Employee not found');

    // 30 days range check
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const dateLimitStr = thirtyDaysAgo.toISOString().split('T')[0];

    const logs = await Attendance.find({
      employee: targetEmployeeId,
      date: { $gte: dateLimitStr }
    }).populate('hotel', 'name hotelCode').sort({ date: -1 });

    // Compute stats
    const presentDays = logs.filter(l => ['Present', 'Late'].includes(l.status)).length;
    const absentDays = logs.filter(l => l.status === 'Absent').length;
    const halfDays = logs.filter(l => l.status === 'Half-Day').length;
    const lateEntries = logs.filter(l => l.status === 'Late').length;

    // Early Checkouts: checkout time before 16:45 (4:45 PM)
    const earlyCheckouts = logs.filter(l => {
      if (!l.checkOut) return false;
      const coTime = new Date(l.checkOut);
      return coTime.getHours() < 16 || (coTime.getHours() === 16 && coTime.getMinutes() < 45);
    }).length;

    const totalWorkingHours = logs.reduce((acc, l) => acc + (l.totalWorkingHours || 0), 0);
    const averageWorkingHours = presentDays > 0 ? Number((totalWorkingHours / presentDays).toFixed(2)) : 0;

    res.status(200).json({
      status: 'success',
      data: {
        employee: {
          id: targetUser.employeeId,
          _id: targetUser._id,
          firstName: targetUser.firstName,
          lastName: targetUser.lastName,
          email: targetUser.email,
          role: targetUser.role,
          designation: targetUser.designation,
          department: targetUser.department,
          phone: targetUser.phone,
          hotel: targetUser.hotel,
        },
        summary: {
          presentDays,
          absentDays,
          halfDays,
          lateEntries,
          earlyCheckouts,
          totalWorkingHours: Number(totalWorkingHours.toFixed(2)),
          averageWorkingHours
        },
        logs
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getAnalyticsData = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const currentUser = req.user;
    if (!currentUser) throw new ApiError(401, 'Unauthorized');

    const hotelId = req.query.hotelId || currentUser.hotel;
    const department = req.query.department;

    const filter: any = {};
    if (currentUser.role !== 'ROOT_ADMIN') {
      if (['HOTEL_ADMIN', 'HR_MANAGER', 'DEPT_MANAGER'].includes(currentUser.role || '')) {
        filter.hotel = currentUser.hotel;
      } else {
        filter.employee = currentUser._id;
      }
    } else if (hotelId) {
      filter.hotel = new mongoose.Types.ObjectId(hotelId as string);
    }

    if (department) {
      const usersInDept = await User.find({ department: department as string }).select('_id');
      const userIds = usersInDept.map(u => u._id);
      filter.employee = { $in: userIds };
    }

    // 1. Status Doughnut Chart Data
    const statusSummary = await Attendance.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const totalStatusCount = statusSummary.reduce((acc, s) => acc + s.count, 0);
    const statusPercentages = statusSummary.map(s => ({
      name: s._id,
      value: totalStatusCount > 0 ? Number(((s.count / totalStatusCount) * 100).toFixed(2)) : 0,
      count: s.count
    }));

    // 2. Line Chart: Attendance rate trend over time (Daily trend of last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const trendDateLimit = thirtyDaysAgo.toISOString().split('T')[0];

    const trendFilter = { ...filter, date: { $gte: trendDateLimit } };
    const dailyTrend = await Attendance.aggregate([
      { $match: trendFilter },
      {
        $group: {
          _id: '$date',
          total: { $sum: 1 },
          present: {
            $sum: {
              $cond: [{ $in: ['$status', ['Present', 'Late']] }, 1, 0]
            }
          }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const trendData = dailyTrend.map(t => ({
      date: t._id,
      rate: t.total > 0 ? Number(((t.present / t.total) * 100).toFixed(2)) : 0
    }));

    // 3. GitHub style heatmap data (Last 90 days)
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const heatmapFilter = { ...filter, date: { $gte: ninetyDaysAgo.toISOString().split('T')[0] } };
    const heatmapRaw = await Attendance.aggregate([
      { $match: heatmapFilter },
      {
        $group: {
          _id: '$date',
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    const heatmapData = heatmapRaw.map(h => ({
      date: h._id,
      count: h.count,
      level: h.count > 0 ? Math.min(4, Math.ceil(h.count / 2)) : 0
    }));

    // 4. Bar Chart: Working hours comparison (Employee-vs-Employee, Dept-vs-Dept, Hotel-vs-Hotel)
    const employeeHours = await Attendance.aggregate([
      { $match: trendFilter },
      {
        $group: {
          _id: '$employee',
          avgHours: { $avg: '$totalWorkingHours' }
        }
      },
      { $sort: { avgHours: -1 } },
      { $limit: 10 }
    ]);
    const employeeHoursPopulated = await User.populate(employeeHours, { path: '_id', select: 'firstName lastName' });
    const employeeHoursData = employeeHoursPopulated.map(item => ({
      name: item._id ? `${item._id.firstName} ${item._id.lastName}` : 'Unknown',
      hours: Number((item.avgHours || 0).toFixed(2))
    }));

    const deptHours = await Attendance.aggregate([
      { $match: trendFilter },
      {
        $lookup: {
          from: 'users',
          localField: 'employee',
          foreignField: '_id',
          as: 'empDoc'
        }
      },
      { $unwind: '$empDoc' },
      {
        $group: {
          _id: '$empDoc.department',
          avgHours: { $avg: '$totalWorkingHours' }
        }
      },
      { $sort: { avgHours: -1 } }
    ]);
    const deptHoursData = deptHours.map(item => ({
      name: item._id || 'Operations',
      hours: Number((item.avgHours || 0).toFixed(2))
    }));

    const hotelHours = await Attendance.aggregate([
      { $match: trendFilter },
      {
        $lookup: {
          from: 'hotels',
          localField: 'hotel',
          foreignField: '_id',
          as: 'hotelDoc'
        }
      },
      { $unwind: '$hotelDoc' },
      {
        $group: {
          _id: '$hotelDoc.name',
          avgHours: { $avg: '$totalWorkingHours' }
        }
      },
      { $sort: { avgHours: -1 } }
    ]);
    const hotelHoursData = hotelHours.map(item => ({
      name: item._id || 'Property',
      hours: Number((item.avgHours || 0).toFixed(2))
    }));

    // 5. Pie Chart: Attendance distribution (Department-wise, Role-wise, Hotel-wise)
    const deptDistribution = await Attendance.aggregate([
      { $match: { ...filter, status: { $in: ['Present', 'Late'] } } },
      {
        $lookup: {
          from: 'users',
          localField: 'employee',
          foreignField: '_id',
          as: 'empDoc'
        }
      },
      { $unwind: '$empDoc' },
      {
        $group: {
          _id: '$empDoc.department',
          value: { $sum: 1 }
        }
      }
    ]);
    const deptDistributionData = deptDistribution.map(item => ({
      name: item._id || 'Operations',
      value: item.value
    }));

    const roleDistribution = await Attendance.aggregate([
      { $match: { ...filter, status: { $in: ['Present', 'Late'] } } },
      {
        $lookup: {
          from: 'users',
          localField: 'employee',
          foreignField: '_id',
          as: 'empDoc'
        }
      },
      { $unwind: '$empDoc' },
      {
        $group: {
          _id: '$empDoc.role',
          value: { $sum: 1 }
        }
      }
    ]);
    const roleDistributionData = roleDistribution.map(item => ({
      name: item._id ? formatRole(item._id) : 'Staff',
      value: item.value
    }));

    const hotelDistribution = await Attendance.aggregate([
      { $match: { ...filter, status: { $in: ['Present', 'Late'] } } },
      {
        $lookup: {
          from: 'hotels',
          localField: 'hotel',
          foreignField: '_id',
          as: 'hotelDoc'
        }
      },
      { $unwind: '$hotelDoc' },
      {
        $group: {
          _id: '$hotelDoc.name',
          value: { $sum: 1 }
        }
      }
    ]);
    const hotelDistributionData = hotelDistribution.map(item => ({
      name: item._id || 'Property',
      value: item.value
    }));

    res.status(200).json({
      status: 'success',
      data: {
        statusPercentages,
        trendData,
        heatmapData,
        workingHours: {
          employee: employeeHoursData,
          department: deptHoursData,
          hotel: hotelHoursData
        },
        distribution: {
          department: deptDistributionData,
          role: roleDistributionData,
          hotel: hotelDistributionData
        }
      }
    });
  } catch (error) {
    next(error);
  }
};
