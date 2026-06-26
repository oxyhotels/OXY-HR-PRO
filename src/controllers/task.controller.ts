import { Request, Response, NextFunction } from 'express';
import { Task } from '@/models/Task';
import { User } from '@/models/User';
import { Hotel } from '@/models/Hotel';
import { ApiError } from '@/utils/ApiError';
import { AuditLog } from '@/models/AuditLog';
import { createNotification } from '@/services/notification.service';
import { getIO } from '@/lib/socket'; // ✅ Socket import added

const normalizeAssignedToIds = (assignedTo: any): string[] => {
  if (!assignedTo) return [];
  if (Array.isArray(assignedTo)) {
    return assignedTo
      .map((id) => id?.toString()?.trim())
      .filter(Boolean)
      .flatMap((id: string) => (id.includes(',') ? id.split(',').map((s: string) => s.trim()) : [id]))
      .filter(Boolean);
  }
  const str = assignedTo.toString().trim();
  if (str.includes(',')) {
    return str.split(',').map((s: string) => s.trim()).filter(Boolean);
  }
  return [str];
};

const isAssignedToUser = (task: any, userId: string): boolean => {
  return normalizeAssignedToIds(task.assignedTo).includes(userId.toString());
};

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

export const createTask = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { 
      title, 
      description, 
      assignedTo, 
      priority, 
      dueDate, 
      dueTime,
      department,
      isRecurring,
      recurringInterval
    } = req.body;

    if (!dueDate) {
      throw new ApiError(400, 'Due Date is required');
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const parsedDueDate = new Date(dueDate);
    parsedDueDate.setHours(0, 0, 0, 0);
    if (parsedDueDate < today) {
      throw new ApiError(400, 'Due Date cannot be in the past');
    }

    let hotelId = req.body.hotelId || req.body.hotel || req.user?.hotel;
    if (req.user?.role === 'ROOT_ADMIN') {
      if (assignedTo) {
        const requestedAssignees = normalizeAssignedToIds(assignedTo);
        if (requestedAssignees.length > 0) {
          const assignee = await User.findById(requestedAssignees[0]);
          if (assignee && assignee.hotel) {
            hotelId = assignee.hotel;
          }
        }
      }
    }
    // If still not resolved, query for any existing hotel as safe default
    if (!hotelId) {
      const { Hotel } = await import('@/models/Hotel');
      const defaultHotel = await Hotel.findOne();
      if (defaultHotel) {
        hotelId = defaultHotel._id;
      }
    }
    if (!hotelId) {
      throw new ApiError(400, 'Tenancy resolve error: No hotel found in system');
    }

    const requestedAssignees = normalizeAssignedToIds(assignedTo);
    let targetAssignee = requestedAssignees.length > 0 ? requestedAssignees[0] : undefined;
    if (!targetAssignee && !department) {
      targetAssignee = req.user?._id?.toString();
    }

    // 1. Resolve SLA Duration
    let slaDuration = 30;
    const textContext = `${title} ${description}`.toLowerCase();
    if (textContext.includes('vip')) {
      slaDuration = 10;
    } else if (
      textContext.includes('ac failure') ||
      textContext.includes('electrical') ||
      textContext.includes('water leak') ||
      textContext.includes('fire')
    ) {
      slaDuration = 15;
    } else if (textContext.includes('clean') || textContext.includes('housekeeping')) {
      slaDuration = 30;
    } else if (priority === 'High') {
      slaDuration = 15;
    } else if (priority === 'Medium') {
      slaDuration = 30;
    } else {
      slaDuration = 60;
    }

    // 2. Workload warning check
    let workloadWarning = null;
    if (targetAssignee) {
      const activeCount = await Task.countDocuments({
        assignedTo: targetAssignee,
        status: { $in: ['Pending', 'To_Do', 'In_Progress'] }, // ✅ Updated statuses
        isDeleted: { $ne: true },
      });
      const assigneeUser = await User.findById(targetAssignee);
      const capacity = assigneeUser?.capacityLimit || 5;
      if (activeCount >= capacity) {
        const alternatives = await User.find({
          hotel: hotelId,
          department: assigneeUser?.department,
          _id: { $ne: targetAssignee },
          status: 'Active',
        });
        const altCandidates = [];
        for (const alt of alternatives) {
          const altCount = await Task.countDocuments({
            assignedTo: alt._id,
            status: { $in: ['Pending', 'To_Do', 'In_Progress'] },
            isDeleted: { $ne: true },
          });
          if (altCount < (alt.capacityLimit || 5)) {
            altCandidates.push({
              _id: alt._id,
              name: `${alt.firstName} ${alt.lastName}`,
              workload: altCount,
            });
          }
        }
        workloadWarning = {
          message: `${assigneeUser?.firstName} ${assigneeUser?.lastName} capacity exceeded (${activeCount}/${capacity} active tasks)!`,
          alternatives: altCandidates.sort((a, b) => a.workload - b.workload),
        };
      }
    }

    // 3. Setup business impact markers
    let guestSatisfaction = 5;
    let revenueImpact = 0;
    let complianceImpact = 0;
    if (textContext.includes('vip') || textContext.includes('complaint')) {
      guestSatisfaction = 1;
      revenueImpact = 150;
    }
    if (textContext.includes('sanit') || textContext.includes('audit') || textContext.includes('safety')) {
      complianceImpact = 100;
    }

    let normalizedInterval: 'Daily' | 'Weekly' | 'None' = 'None';
    const recurringBool = isRecurring === true || isRecurring === 'true';
    if (recurringBool) {
      const lower = (recurringInterval || '').toString().toLowerCase();
      if (lower === 'daily') {
        normalizedInterval = 'Daily';
      } else if (lower === 'weekly') {
        normalizedInterval = 'Weekly';
      } else if (lower === 'monthly') {
        // Fallback or handle monthly if required, otherwise default Daily
        normalizedInterval = 'Weekly';
      } else {
        normalizedInterval = 'Daily';
      }
    }

    const task = await Task.create({
      title,
      description,
      hotel: hotelId,
      assignedTo: requestedAssignees.length > 0 ? requestedAssignees : (targetAssignee ? [targetAssignee] : undefined),
      assignedBy: req.user?._id,
      priority,
      dueDate,
      dueTime: dueTime || undefined,
      status: 'Pending',
      progress: 0,
      department: department || undefined,
      isRecurring: recurringBool,
      recurringInterval: normalizedInterval,
      slaDuration,
      businessImpact: { guestSatisfaction, revenueImpact, complianceImpact },
      taskHistory: [{ // ✅ Initial assignment history
        action: 'Assigned',
        remark: 'Task created and assigned',
        userId: req.user?._id,
        userName: req.user?.firstName ? `${req.user.firstName} ${req.user.lastName}` : 'System Admin',
        timestamp: new Date()
      }],
      taskUpdates: [{ // ✅ Initial task update
        status: 'Pending',
        description: 'Task created and assigned',
        updatedBy: req.user?._id,
        updatedByName: req.user ? `${req.user.firstName} ${req.user.lastName}` : 'System Admin',
        department: req.user?.department || '',
        designation: req.user?.designation || '',
        createdAt: new Date()
      }]
    });

    await AuditLog.create({
      user: req.user?._id,
      hotel: hotelId,
      action: 'CREATE_TASK',
      module: 'TASK',
      details: `Task "${title}" created (SLA: ${slaDuration}m). Workload Warning: ${workloadWarning ? workloadWarning.message : 'None'}`,
    });

    try {
      const assigneeIds: string[] = [];
      if (Array.isArray(requestedAssignees) && requestedAssignees.length > 0) {
        assigneeIds.push(...requestedAssignees);
      } else if (targetAssignee) {
        assigneeIds.push(targetAssignee.toString());
      } else if (req.body.assignedDepartments && req.body.assignedDepartments.length > 0) {
        const deptUsers = await User.find({
          department: { $in: req.body.assignedDepartments },
          status: 'Active'
        }).select('_id');
        deptUsers.forEach(u => assigneeIds.push(u._id.toString()));
      }

      for (const assigneeId of assigneeIds) {
        await createNotification({
          title: '📌 नया कार्य सौंपा गया है',
          message: `नया कार्य "${title}" आपके लिए असाइन किया गया है। कृपया कार्य स्वीकार करें।`,
          type: 'task',
          recipientId: assigneeId,
          link: '/dashboard/tasks',
          sender: req.user?._id?.toString()
        });
      }
    } catch (notifError) {
      console.error('Failed to send task notification:', notifError);
    }

    // ✅ Emit Real-time Task Created
    const io = getIO();
    if (io) {
      io.to('ROOT_ADMIN_ROOM').emit('task_created', { task });
      if (hotelId) io.to(`HOTEL_${hotelId}`).emit('task_created', { task });
    }

    res.status(201).json({
      status: 'success',
      data: { task, workloadWarning },
    });
  } catch (error) {
    next(error);
  }
};

export const getTasks = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const filter: any = { isDeleted: { $ne: true } };

    if (req.user?.role !== 'ROOT_ADMIN') {
      filter.hotel = req.user?.hotel;
    } else if (req.query.hotelId) {
      filter.hotel = req.query.hotelId;
    }

    if (req.query.status) {
      filter.status = req.query.status;
    }

    if (req.user?.role !== 'ROOT_ADMIN') {
      const rootAdmins = await User.find({ role: 'ROOT_ADMIN' }).select('_id');
      const rootAdminIds = rootAdmins.map((r) => r._id);

      const orConditions: any[] = [
        { assignedTo: req.user?._id },
        { assignedBy: req.user?._id },
        { assignedTo: { $exists: false } },
        { assignedTo: null },
        { assignedBy: { $in: rootAdminIds } },
      ];

      if (req.user?.department) {
        orConditions.push({ department: req.user.department });
      }

      filter.$or = orConditions;
    } else {
      if (req.query.assignedTo) {
        filter.assignedTo = req.query.assignedTo;
      }
    }

    const tasks = await Task.find(filter)
      .populate('assignedTo', 'firstName lastName email department designation xp level accountabilityIndex employeeId photoUrl')
      .populate('assignedBy', 'firstName lastName email role')
      .sort({ createdAt: -1 })
      .lean()
      .limit(300);

    const safeTasks = tasks.map((t: any) => ({
      ...t,
      responses: t.responses || [],
      taskWorkSessions: t.taskWorkSessions || [],
      assignedTo: t.assignedTo || [],
      assignedDepartments: t.assignedDepartments || [],
      checklist: t.checklist || [],
    }));

    res.status(200).json({
      status: 'success',
      results: safeTasks.length,
      data: { tasks: safeTasks },
    });
  } catch (error) {
    next(error);
  }
};

export const updateTask = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task || task.isDeleted) throw new ApiError(404, 'Task not found');

    if (req.user?.role !== 'ROOT_ADMIN' && task.hotel.toString() !== req.user?.hotel?.toString()) {
      throw new ApiError(403, 'Unauthorized');
    }

    if (req.user?.role === 'EMPLOYEE' && !isAssignedToUser(task, req.user._id.toString())) {
      throw new ApiError(403, 'You are not authorized to update this task');
    }

    const previousStatus = task.status;
    const { status, progress, lat, lng, selfieUrl, rcaReason, rcaCategory, remark } = req.body; // ✅ Added 'remark'

    // ✅ ENHANCED KANBAN TRACKING LOGIC
    if (status && status !== previousStatus) {
      task.status = status;

      if (status === 'In_Progress') {
        task.slaStart = new Date();
      }

      if ((previousStatus === 'Completed' || previousStatus === 'In_Progress') && (status === 'Pending' || status === 'In_Progress')) {
        task.reworkCount = (task.reworkCount || 0) + 1;
      }

      let historyAction = status;
      const currentRemark = remark || '';

      if (status === 'To_Do') historyAction = 'Accepted';
      if (status === 'In_Progress') historyAction = previousStatus === 'On_Hold' ? 'Resumed' : 'Started';
      if (status === 'On_Hold') {
        if (!currentRemark) throw new ApiError(400, "Hold Reason is mandatory");
        task.holdReason = currentRemark;
        historyAction = 'Hold';
      }
      if (status === 'Completed') {
        if (!currentRemark) throw new ApiError(400, "Completion Remark is mandatory");
        task.completionRemark = currentRemark;
        historyAction = 'Completed';
      }

      task.latestRemark = currentRemark;
      const userNameStr = req.user?.firstName ? `${req.user.firstName} ${req.user.lastName}` : 'System User';

      if (!req.user) {
        throw new ApiError(401, 'Unauthorized');
      }

      task.taskHistory.push({
        action: historyAction,
        remark: currentRemark,
        userId: req.user._id,
        userName: userNameStr,
        timestamp: new Date()
      });

      // ✅ Add to taskUpdates array
      task.taskUpdates.push({
        status,
        description: currentRemark,
        photoUrl: req.body.photoUrl || req.body.photo || undefined,
        updatedBy: req.user._id,
        updatedByName: userNameStr,
        department: req.user?.department || '',
        designation: req.user?.designation || '',
        createdAt: new Date()
      });
    }

    if (progress !== undefined) {
      task.progress = Number(progress);
    }

    if (req.user?.role !== 'EMPLOYEE') {
      const updates = { ...req.body };
      delete updates.status;
      delete updates.progress;
      delete updates.remark; // Remove so it doesn't overwrite accidentally
      Object.assign(task, updates);
    }

    if (rcaReason && rcaCategory) {
      task.rca = { reason: rcaReason, category: rcaCategory, loggedAt: new Date() };
    }

    // 4. Handle Task Completion Verifications
    if (status === 'Completed') {
      const completionLat = lat || req.body.geoVerified?.lat;
      const completionLng = lng || req.body.geoVerified?.lng;
      const completionSelfie = selfieUrl || req.body.geoVerified?.selfieUrl;

      let isSuspicious = false;
      const fraudFlags: string[] = [];

      if (completionLat && completionLng) {
        const hotel = await Hotel.findById(task.hotel);
        if (hotel && hotel.latitude && hotel.longitude) {
          const dist = getDistance(completionLat, completionLng, hotel.latitude, hotel.longitude);
          if (dist > (hotel.geofenceRadius || 200)) {
            isSuspicious = true;
            fraudFlags.push('WRONG_LOCATION');
          }
        }
      } else {
        isSuspicious = true;
        fraudFlags.push('MISSING_LOCATION');
      }

      if (!completionSelfie) {
        isSuspicious = true;
        fraudFlags.push('MISSING_SELFIE');
      }

      task.geoVerified = {
        verified: true,
        lat: completionLat || 0,
        lng: completionLng || 0,
        selfieUrl: completionSelfie || '',
        isSuspicious,
        fraudFlags,
      };

      // 5. Task Health Score Calculation
      let slaBreached = false;
      if (task.slaStart && task.slaDuration) {
        const elapsedMinutes = (new Date().getTime() - new Date(task.slaStart).getTime()) / 60000;
        if (elapsedMinutes > task.slaDuration) {
          slaBreached = true;
          task.slaBreached = true;
        }
      }

      let health = 100;
      if (slaBreached) health -= 30;
      if (task.reworkCount && task.reworkCount > 0) health -= task.reworkCount * 15;
      if (isSuspicious) health -= 40;
      task.healthScore = Math.max(20, Math.min(100, health));

      // 6. Gamification Rewards
      if (task.assignedTo && Array.isArray(task.assignedTo)) {
        for (const assigneeId of task.assignedTo) {
          const assignee = await User.findById(assigneeId);
          if (assignee) {
            const xpGained = task.priority === 'High' ? 30 : task.priority === 'Medium' ? 20 : 10;
            assignee.xp = (assignee.xp || 0) + (isSuspicious ? 0 : xpGained);

            const nextLevelThreshold = (assignee.level || 1) * 100;
            if (assignee.xp >= nextLevelThreshold) {
              assignee.level = (assignee.level || 1) + 1;
              const currentBadges = assignee.badges || [];
              if (!currentBadges.includes('Task Warrior') && assignee.level >= 2) currentBadges.push('Task Warrior');
              if (!currentBadges.includes('Legend Performer') && assignee.level >= 5) currentBadges.push('Legend Performer');
              assignee.badges = currentBadges;
            }

            let currentAcc = assignee.accountabilityIndex || 100;
            if (slaBreached) currentAcc -= 5;
            if (task.reworkCount && task.reworkCount > 0) currentAcc -= 10;
            if (isSuspicious) currentAcc -= 25;
            assignee.accountabilityIndex = Math.max(20, Math.min(100, currentAcc));

            await assignee.save();
          }
        }
      }
    }

    await task.save();

    await AuditLog.create({
      user: req.user?._id,
      hotel: task.hotel,
      action: 'UPDATE_TASK',
      module: 'TASK',
      details: `Task "${task.title}" updated to status ${status}. Health Score: ${task.healthScore || 'N/A'}`,
    });

    // ✅ REAL-TIME SOCKET EMISSION TO UPDATE DASHBOARD
    const io = getIO();
    if (io) {
      io.to('ROOT_ADMIN_ROOM').emit('task_status_updated', { taskId: task._id, task: task });
      if (task.hotel) {
        io.to(`HOTEL_${task.hotel}`).emit('task_status_updated', { taskId: task._id, task: task });
      }
    }

    res.status(200).json({
      status: 'success',
      data: { task },
    });
  } catch (error) {
    next(error);
  }
};

export const deleteTask = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task || task.isDeleted) throw new ApiError(404, 'Task not found');

    if (req.user?.role !== 'ROOT_ADMIN' && task.hotel.toString() !== req.user?.hotel?.toString()) {
      throw new ApiError(403, 'Unauthorized');
    }

    task.isDeleted = true;
    task.deletedAt = new Date();
    await task.save();

    await AuditLog.create({
      user: req.user?._id,
      hotel: task.hotel,
      action: 'SOFT_DELETE_TASK',
      module: 'TASK',
      details: `Task "${task.title}" soft deleted`,
    });

    res.status(204).json({
      status: 'success',
      data: null,
    });
  } catch (error) {
    next(error);
  }
};