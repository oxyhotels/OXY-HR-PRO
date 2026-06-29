import { Request, Response, NextFunction } from 'express';
import { AIPerformance } from '@/models/AIPerformance';
import { User } from '@/models/User';
import { Attendance } from '@/models/Attendance';
import { Task } from '@/models/Task';
import { Certification } from '@/models/Lms';
import { ApiError } from '@/utils/ApiError';

// AI score generator engine logic
export const calculatePerformanceIndex = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { employeeId, month, year } = req.body;
    
    const employee = await User.findById(employeeId).lean() as any;
    if (!employee) {
      throw new ApiError(404, 'Employee profile not found');
    }

    // 1. Calculate Attendance Score (late marks, absent days vs total checked days)
    const startStr = `${year}-${String(month).padStart(2, '0')}-01`;
    const endStr = `${year}-${String(month).padStart(2, '0')}-31`;
    const attendanceRecords = await Attendance.find({
          employee: employeeId,
          date: { $gte: startStr, $lte: endStr }
        }).lean() as any;

    let attendanceScore = 100;
    if (attendanceRecords.length > 0) {
      const lateCount = attendanceRecords.filter(r => r.status === 'Late').length;
      const absentCount = attendanceRecords.filter(r => r.status === 'Absent').length;
      const halfDayCount = attendanceRecords.filter(r => r.status === 'Half-Day').length;
      
      attendanceScore = Math.max(0, 100 - (absentCount * 15) - (lateCount * 3) - (halfDayCount * 5));
    }

    // 2. Calculate Productivity / Task Score (Completed tasks / Assigned tasks)
    const tasks = await Task.find({
          assignedTo: employeeId,
          createdAt: { 
            $gte: new Date(year, month - 1, 1), 
            $lte: new Date(year, month, 0, 23, 59, 59)
          }
        }).lean() as any;

    let productivityScore = 80; // baseline default
    if (tasks.length > 0) {
      const completedCount = tasks.filter(t => t.status === 'Completed').length;
      productivityScore = Math.round((completedCount / tasks.length) * 100);
    }

    // 3. Training Score (LMS Certifications and passing counts)
    const certifications = await Certification.find({ employee: employeeId }).lean() as any;
    const trainingScore = certifications.length > 0 
      ? Math.min(100, 70 + (certifications.length * 10)) // Base 70% + 10% per certificate
      : 60; // 60 if no certifications

    // 4. Baseline Scores for guestSatisfaction, discipline, kpi
    const guestSatisfactionScore = 80 + Math.floor(Math.random() * 21); // mock range 80-100
    const disciplineScore = Math.min(100, attendanceScore + 5);
    const kpiScore = Math.round((productivityScore + attendanceScore) / 2);

    // Calculate OXY Performance Index (OPI) weighted score
    const opiScore = Math.round(
      (productivityScore * 0.3) +
      (attendanceScore * 0.2) +
      (disciplineScore * 0.1) +
      (trainingScore * 0.15) +
      (kpiScore * 0.15) +
      (guestSatisfactionScore * 0.1)
    );

    // AI Promotion / Warning Engine logic
    let promotionRecommendation: any = 'None';
    let warningRecommendation: any = 'None';
    let summary = `${employee.firstName} has maintained steady operations.`;

    if (opiScore >= 90) {
      promotionRecommendation = 'Highly Recommended';
      summary = `Exceptional performer. ${employee.firstName} exhibits exemplary discipline, rapid task closures, and high compliance score. Eligible for promotion.`;
    } else if (opiScore >= 80) {
      promotionRecommendation = 'Recommended';
      summary = `Strong operational contributor. High attendance index with consistent workflow output.`;
    } else if (opiScore < 60) {
      warningRecommendation = 'Performance Improvement Plan';
      summary = `Critical performance dip. Needs structured mentoring, training reviews, and immediate attendance monitoring.`;
    } else if (opiScore < 70) {
      warningRecommendation = 'Written Warning';
      summary = `Inconsistent performance indicators. Attendance late marks and low checklist completion ratios.`;
    }

    const performanceRecord = await AIPerformance.findOneAndUpdate(
      { employee: employeeId, month, year },
      {
        scores: {
          productivity: productivityScore,
          attendance: attendanceScore,
          discipline: disciplineScore,
          training: trainingScore,
          kpi: kpiScore,
          guestSatisfaction: guestSatisfactionScore,
        },
        opiScore,
        promotionRecommendation,
        warningRecommendation,
        summary,
        generatedAt: new Date(),
      },
      { upsert: true, new: true }
    );

    res.status(200).json({
      status: 'success',
      data: { performanceRecord },
    });
  } catch (error) {
    next(error);
  }
};

export const getOpiMetrics = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const employeeId = req.params.userId;
    // Fetch latest monthly performance logs
    const logs = await AIPerformance.find({ employee: employeeId })
          .sort({ year: -1, month: -1 })
          .limit(6).lean() as any; // return last 6 months metrics

    res.status(200).json({
      status: 'success',
      data: { logs },
    });
  } catch (error) {
    next(error);
  }
};

export const getLeaderboard = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    // Query latest calculations grouped by users
    const records = await AIPerformance.find({ month: currentMonth, year: currentYear })
          .populate({
            path: 'employee',
            select: 'firstName lastName email department designation photoUrl hotel',
            populate: { path: 'hotel', select: 'name hotelCode' }
          })
          .sort({ opiScore: -1 })
          .limit(50).lean() as any; // Top 50

    // Filter by user tenant if not root admin
    let filteredRecords = records;
    if (req.user?.role !== 'ROOT_ADMIN') {
      filteredRecords = records.filter(r => 
        (r.employee as any)?.hotel?._id?.toString() === req.user?.hotel?.toString()
      );
    }

    res.status(200).json({
      status: 'success',
      data: { leaderboard: filteredRecords },
    });
  } catch (error) {
    next(error);
  }
};
