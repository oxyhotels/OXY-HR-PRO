import { Request, Response, NextFunction } from 'express';
import { Task } from '@/models/Task';
import { User } from '@/models/User';
import { Hotel } from '@/models/Hotel';
import { Incident } from '@/models/Incident';
import { ShiftHandover } from '@/models/ShiftHandover';
import { ApiError } from '@/utils/ApiError';
import { AuditLog } from '@/models/AuditLog';

// Helper to calculate distance in meters using Haversine formula
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // metres
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

// 1. AI Copilot Chat Interface Agent
export const handleAICopilotQuery = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { query } = req.body;
    const hotelId = req.user?.hotel;

    if (!query) throw new ApiError(400, 'Query is required');

    const normalizedQuery = query.toLowerCase().trim();
    let reply = '';
    let dataContext: any = null;

    // A. "Which tasks are at risk today?"
    if (normalizedQuery.includes('at risk') || normalizedQuery.includes('risk today')) {
      const riskTasks = await Task.find({
        hotel: hotelId,
        isDeleted: { $ne: true },
        status: { $in: ['Todo', 'In_Progress'] },
        $or: [
          { priority: 'High' },
          { slaBreached: true },
          { dueDate: { $lte: new Date() } }
        ]
      }).populate('assignedTo', 'firstName lastName');

      reply = `I found ${riskTasks.length} tasks that are currently marked high priority, have breached their SLA, or are past their due date. Urgent attention is recommended.`;
      dataContext = riskTasks.map(t => ({
        id: t._id,
        title: t.title,
        priority: t.priority,
        assignee: t.assignedTo ? `${(t.assignedTo as any).firstName} ${(t.assignedTo as any).lastName}` : 'Unassigned',
        dueDate: t.dueDate,
        slaBreached: t.slaBreached
      }));
    }

    // B. "Which employee is overloaded?"
    else if (normalizedQuery.includes('overloaded') || normalizedQuery.includes('workload')) {
      const employees = await User.find({ hotel: hotelId, status: 'Active' });
      const overloadedList = [];

      for (const emp of employees) {
        const activeTasks = await Task.countDocuments({
          assignedTo: emp._id,
          status: { $in: ['Todo', 'In_Progress'] },
          isDeleted: { $ne: true }
        });
        const limit = emp.capacityLimit || 5;
        if (activeTasks >= limit) {
          overloadedList.push({
            name: `${emp.firstName} ${emp.lastName}`,
            department: emp.department,
            activeCount: activeTasks,
            capacity: limit
          });
        }
      }

      if (overloadedList.length > 0) {
        reply = `Alert! ${overloadedList.length} staff member(s) exceed their active capacity limit. Reassigning tasks or allocating helpers is suggested.`;
      } else {
        reply = `All active staff members are currently operating within their safe capacity margins.`;
      }
      dataContext = overloadedList;
    }

    // C. "Which hotel has most overdue tasks?"
    else if (normalizedQuery.includes('most overdue') || normalizedQuery.includes('hotel overdue')) {
      const hotels = await Hotel.find();
      const stats = [];

      for (const h of hotels) {
        const overdueCount = await Task.countDocuments({
          hotel: h._id,
          isDeleted: { $ne: true },
          status: { $in: ['Todo', 'In_Progress'] },
          dueDate: { $lt: new Date() }
        });
        stats.push({ hotelName: h.name, overdueCount });
      }

      stats.sort((a, b) => b.overdueCount - a.overdueCount);
      const topHotel = stats[0];

      if (topHotel && topHotel.overdueCount > 0) {
        reply = `Property Analysis: "${topHotel.hotelName}" has the highest volume of overdue tasks (${topHotel.overdueCount} tasks currently behind schedule).`;
      } else {
        reply = `Operational report shows no properties have overdue tasks at the moment. Excellent!`;
      }
      dataContext = stats;
    }

    // D. "Which department causes maximum delays?"
    else if (normalizedQuery.includes('maximum delays') || normalizedQuery.includes('department delay')) {
      const delayedTasks = await Task.find({
        hotel: hotelId,
        isDeleted: { $ne: true },
        $or: [{ slaBreached: true }, { dueDate: { $lt: new Date() } }]
      });

      const delayMap: Record<string, number> = {};
      delayedTasks.forEach(task => {
        const dept = task.department || 'General Operations';
        delayMap[dept] = (delayMap[dept] || 0) + 1;
      });

      const stats = Object.entries(delayMap).map(([dept, count]) => ({ department: dept, delayCount: count }));
      stats.sort((a, b) => b.delayCount - a.delayCount);
      const worstDept = stats[0];

      if (worstDept) {
        reply = `SLA Analytics: The "${worstDept.department}" department currently logs the highest frequency of delay warnings (${worstDept.delayCount} instances recorded).`;
      } else {
        reply = `Clean SLA Sheet! No delays have been logged for any department.`;
      }
      dataContext = stats;
    }

    // Default Fallback Q&A
    else {
      reply = `Hello! I am your Intelligent Operations Copilot. You can ask me query vectors like "Which employee is overloaded?", "Which tasks are at risk today?", "Which hotel has the most overdue tasks?", or "Which department causes the maximum delays?".`;
    }

    res.status(200).json({
      status: 'success',
      data: { reply, dataContext }
    });
  } catch (error) {
    next(error);
  }
};

// 2. Incident Management Endpoints
export const createIncident = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { title, description, category, recoverySteps } = req.body;
    const hotelId = req.user?.hotel;

    if (!hotelId) throw new ApiError(400, 'Tenancy resolve error');

    const timelineEntry = {
      message: `Emergency reported: ${category} - "${title}" by ${req.user?.firstName} ${req.user?.lastName}`,
      timestamp: new Date()
    };

    const incident = await Incident.create({
      title,
      description,
      hotel: hotelId,
      category,
      status: 'Active',
      timeline: [timelineEntry],
      recoverySteps: recoverySteps || [],
      loggedBy: req.user?._id
    });

    await AuditLog.create({
      user: req.user?._id,
      hotel: hotelId,
      action: 'REPORT_EMERGENCY',
      module: 'INCIDENT',
      details: `EMERGENCY Incident "${title}" reported. Status: Active`,
    });

    res.status(201).json({
      status: 'success',
      data: { incident }
    });
  } catch (error) {
    next(error);
  }
};

export const getIncidents = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const filter: any = {};
    if (req.user?.role !== 'ROOT_ADMIN') {
      filter.hotel = req.user?.hotel;
    }

    const incidents = await Incident.find(filter)
      .populate('loggedBy', 'firstName lastName email')
      .sort({ createdAt: -1 });

    res.status(200).json({
      status: 'success',
      data: { incidents }
    });
  } catch (error) {
    next(error);
  }
};

export const updateIncident = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { status, logMessage, rootCause, preventAction } = req.body;
    const incident = await Incident.findById(req.params.id);

    if (!incident) throw new ApiError(404, 'Incident log not found');

    if (req.user?.role !== 'ROOT_ADMIN' && incident.hotel.toString() !== req.user?.hotel?.toString()) {
      throw new ApiError(403, 'Unauthorized');
    }

    if (status) {
      incident.status = status;
      incident.timeline.push({
        message: `Incident status updated to ${status}`,
        timestamp: new Date()
      });
    }

    if (logMessage) {
      incident.timeline.push({
        message: logMessage,
        timestamp: new Date()
      });
    }

    if (rootCause || preventAction) {
      incident.rca = {
        rootCause: rootCause || incident.rca?.rootCause || '',
        preventAction: preventAction || incident.rca?.preventAction || ''
      };
    }

    await incident.save();

    res.status(200).json({
      status: 'success',
      data: { incident }
    });
  } catch (error) {
    next(error);
  }
};

// 3. Shift Handover Endpoints
export const createHandover = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { incomingStaffId, taskIds, notes } = req.body;
    const hotelId = req.user?.hotel;

    if (!hotelId) throw new ApiError(400, 'Tenancy resolve error');

    const handover = await ShiftHandover.create({
      hotel: hotelId,
      outgoingStaff: req.user?._id,
      incomingStaff: incomingStaffId,
      tasks: taskIds || [],
      status: 'Pending',
      notes
    });

    res.status(201).json({
      status: 'success',
      data: { handover }
    });
  } catch (error) {
    next(error);
  }
};

export const acceptHandover = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const handover = await ShiftHandover.findById(req.params.id);
    if (!handover) throw new ApiError(404, 'Handover log not found');

    if (handover.incomingStaff.toString() !== req.user?._id.toString()) {
      throw new ApiError(403, 'Only the designated assignee can accept this handover');
    }

    handover.status = 'Accepted';
    handover.acceptedAt = new Date();
    await handover.save();

    // Reassign the tasks to the incoming staff member
    if (handover.tasks && handover.tasks.length > 0) {
      await Task.updateMany(
        { _id: { $in: handover.tasks } },
        { assignedTo: req.user?._id }
      );
    }

    res.status(200).json({
      status: 'success',
      data: { handover }
    });
  } catch (error) {
    next(error);
  }
};

export const getHandovers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const filter: any = {};
    if (req.user?.role !== 'ROOT_ADMIN') {
      filter.hotel = req.user?.hotel;
      filter.$or = [
        { outgoingStaff: req.user?._id },
        { incomingStaff: req.user?._id }
      ];
    }

    const handovers = await ShiftHandover.find(filter)
      .populate('outgoingStaff', 'firstName lastName email department')
      .populate('incomingStaff', 'firstName lastName email department')
      .populate('tasks', 'title status priority')
      .sort({ createdAt: -1 });

    res.status(200).json({
      status: 'success',
      data: { handovers }
    });
  } catch (error) {
    next(error);
  }
};

// 4. Metrics Dashboard (Accountability, Managers effectiveness, Hotel rankings)
export const getOpsMetrics = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const hotelId = req.user?.hotel;

    // A. Employee Accountability index
    const employees = await User.find({ hotel: hotelId, role: 'EMPLOYEE', status: 'Active' })
      .select('firstName lastName department designation accountabilityIndex xp level badges')
      .sort({ accountabilityIndex: -1 });

    // B. Manager Effectiveness Score
    // Formula: (Team completed tasks / Team total tasks) * 100 - (Escalations * 5) + (SLA Compliance Ratio * 20)
    const managers = await User.find({ hotel: hotelId, role: { $in: ['DEPT_MANAGER', 'HR_MANAGER', 'HOTEL_ADMIN'] } });
    const managerRankings = [];

    for (const mgr of managers) {
      // Find all tasks created by this manager or assigned to their department
      const totalTasksCount = await Task.countDocuments({
        hotel: hotelId,
        assignedBy: mgr._id,
        isDeleted: { $ne: true }
      });
      const completedTasksCount = await Task.countDocuments({
        hotel: hotelId,
        assignedBy: mgr._id,
        status: 'Completed',
        isDeleted: { $ne: true }
      });
      const breachedCount = await Task.countDocuments({
        hotel: hotelId,
        assignedBy: mgr._id,
        slaBreached: true,
        isDeleted: { $ne: true }
      });

      const completionRatio = totalTasksCount > 0 ? completedTasksCount / totalTasksCount : 0;
      const slaComplianceRatio = totalTasksCount > 0 ? (totalTasksCount - breachedCount) / totalTasksCount : 1;

      const effectiveness = Math.max(10, Math.min(100, Math.round(
        (completionRatio * 70) + (slaComplianceRatio * 30)
      )));

      managerRankings.push({
        _id: mgr._id,
        name: `${mgr.firstName} ${mgr.lastName}`,
        role: mgr.role,
        effectivenessScore: effectiveness,
        completedCount: completedTasksCount,
        breachedCount
      });
    }
    managerRankings.sort((a, b) => b.effectivenessScore - a.effectivenessScore);

    // C. Hotel Operations score
    const hotels = await Hotel.find();
    const hotelRankings = [];

    for (const h of hotels) {
      const hotelTasksCount = await Task.countDocuments({ hotel: h._id, isDeleted: { $ne: true } });
      const hotelCompletedCount = await Task.countDocuments({ hotel: h._id, status: 'Completed', isDeleted: { $ne: true } });
      const hotelBreachesCount = await Task.countDocuments({ hotel: h._id, slaBreached: true, isDeleted: { $ne: true } });

      const completionRate = hotelTasksCount > 0 ? (hotelCompletedCount / hotelTasksCount) * 100 : 80;
      const slaSucceededRate = hotelTasksCount > 0 ? ((hotelTasksCount - hotelBreachesCount) / hotelTasksCount) * 100 : 90;

      // Operations Score = 0.5 * CompletionRate + 0.5 * SlaSuccess
      const opScore = Math.round((completionRate + slaSucceededRate) / 2);

      hotelRankings.push({
        _id: h._id,
        name: h.name,
        code: h.code,
        operationsScore: opScore,
        totalTasks: hotelTasksCount,
        completedTasks: hotelCompletedCount,
        breaches: hotelBreachesCount,
        region: h.address.state || 'Local'
      });
    }
    hotelRankings.sort((a, b) => b.operationsScore - a.operationsScore);

    res.status(200).json({
      status: 'success',
      data: {
        employees,
        managers: managerRankings,
        hotels: hotelRankings
      }
    });
  } catch (error) {
    next(error);
  }
};

// 5. Offline Sync Handler
export const offlineSync = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { updates } = req.body;
    if (!Array.isArray(updates)) throw new ApiError(400, 'Updates array is required');

    const syncResults = [];

    for (const update of updates) {
      const { taskId, status, progress, lat, lng, selfieUrl, rcaReason, rcaCategory } = update;
      try {
        const task = await Task.findById(taskId);
        if (task) {
          const prevStatus = task.status;
          task.status = status;
          task.progress = Number(progress || 100);

          if (status === 'In_Progress' && prevStatus !== 'In_Progress') {
            task.slaStart = new Date();
          }

          if (rcaReason && rcaCategory) {
            task.rca = { reason: rcaReason, category: rcaCategory, loggedAt: new Date() };
          }

          if (status === 'Completed') {
            let isSuspicious = false;
            const fraudFlags = [];

            if (lat && lng) {
              const hotel = await Hotel.findById(task.hotel);
              if (hotel) {
                const dist = getDistance(lat, lng, hotel.latitude, hotel.longitude);
                if (dist > (hotel.geofenceRadius || 200)) {
                  isSuspicious = true;
                  fraudFlags.push('WRONG_LOCATION');
                }
              }
            } else {
              isSuspicious = true;
              fraudFlags.push('MISSING_LOCATION');
            }

            if (!selfieUrl) {
              isSuspicious = true;
              fraudFlags.push('MISSING_SELFIE');
            }

            task.geoVerified = {
              verified: true,
              lat: lat || 0,
              lng: lng || 0,
              selfieUrl: selfieUrl || '',
              isSuspicious,
              fraudFlags
            };

            let slaBreached = false;
            if (task.slaStart && task.slaDuration) {
              const elapsed = (new Date().getTime() - new Date(task.slaStart).getTime()) / 60000;
              if (elapsed > task.slaDuration) {
                slaBreached = true;
                task.slaBreached = true;
              }
            }

            let health = 100;
            if (slaBreached) health -= 30;
            if (task.reworkCount && task.reworkCount > 0) health -= task.reworkCount * 15;
            if (isSuspicious) health -= 40;
            task.healthScore = Math.max(20, Math.min(100, health));
          }

          await task.save();
          syncResults.push({ taskId, status: 'synced', success: true });
        } else {
          syncResults.push({ taskId, status: 'failed', message: 'Task not found' });
        }
      } catch (err: any) {
        syncResults.push({ taskId, status: 'failed', message: err.message || 'Error syncing task' });
      }
    }

    res.status(200).json({
      status: 'success',
      data: { results: syncResults }
    });
  } catch (error) {
    next(error);
  }
};
