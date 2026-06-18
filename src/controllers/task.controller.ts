import { Request, Response, NextFunction } from 'express';
import { Task } from '@/models/Task';
import { User } from '@/models/User';
import { Hotel } from '@/models/Hotel';
import { ApiError } from '@/utils/ApiError';
import { AuditLog } from '@/models/AuditLog';
import { createNotification } from '@/services/notification.service';

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
    const { title, description, assignedTo, priority, dueDate, department } = req.body;

    let hotelId = req.user?.hotel;
    if (req.user?.role === 'ROOT_ADMIN') {
      // For ROOT_ADMIN, get hotel from assigned user if provided
      if (assignedTo) {
        const assignee = await User.findById(assignedTo);
        if (assignee && assignee.hotel) {
          hotelId = assignee.hotel;
        }
      }
      // If still no hotel, try from request body
      if (!hotelId) {
        hotelId = req.body.hotelId;
      }
      // ROOT_ADMIN can assign tasks without hotel - notifications will go to respective dashboards
      // Only require hotel for non-ROOT_ADMIN users
      if (!hotelId && req.user?.role !== 'ROOT_ADMIN') {
        throw new ApiError(400, 'Tenancy resolve error');
      }
    } else if (!hotelId) {
      throw new ApiError(400, 'Tenancy resolve error');
    }

    let targetAssignee = assignedTo || undefined;
    if (req.user?.role === 'EMPLOYEE') {
      targetAssignee = req.user._id;
    } else if (!targetAssignee && !department) {
      targetAssignee = req.user?._id;
    }

    // 1. Resolve SLA Duration based on rules
    let slaDuration = 30; // default 30 min
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
        status: { $in: ['Pending', 'In_Progress'] },
        isDeleted: { $ne: true },
      });
      const assigneeUser = await User.findById(targetAssignee);
      const capacity = assigneeUser?.capacityLimit || 5;
      if (activeCount >= capacity) {
        // Find alternative assignee inside the same hotel & department with lower workload
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
            status: { $in: ['Pending', 'In_Progress'] },
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
      guestSatisfaction = 1; // highly critical for satisfaction
      revenueImpact = 150; // mock dollar risk
    }
    if (textContext.includes('sanit') || textContext.includes('audit') || textContext.includes('safety')) {
      complianceImpact = 100;
    }

    const task = await Task.create({
      title,
      description,
      hotel: hotelId,
      assignedTo: targetAssignee,
      assignedBy: req.user?._id,
      priority,
      dueDate,
      status: 'Pending',
      progress: 0,
      department: department || undefined,
      slaDuration,
      businessImpact: {
        guestSatisfaction,
        revenueImpact,
        complianceImpact,
      },
    });

    await AuditLog.create({
      user: req.user?._id,
      hotel: hotelId,
      action: 'CREATE_TASK',
      module: 'TASK',
      details: `Task "${title}" created (SLA: ${slaDuration}m). Workload Warning: ${workloadWarning ? workloadWarning.message : 'None'}`,
    });

    // Send notification to assigned user(s)
    try {
      const assigneeIds: string[] = [];
      
      if (targetAssignee) {
        assigneeIds.push(targetAssignee.toString());
      } else if (req.body.assignedDepartments && req.body.assignedDepartments.length > 0) {
        // For department-wise or all-departments assignment
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
          type: 'info',
          recipientId: assigneeId,
          link: '/dashboard/tasks'
        });
      }
    } catch (notifError) {
      console.error('Failed to send task notification:', notifError);
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
      .populate('assignedTo', 'firstName lastName email department designation xp level accountabilityIndex')
      .populate('assignedBy', 'firstName lastName email')
      .sort({ createdAt: -1 });

    res.status(200).json({
      status: 'success',
      results: tasks.length,
      data: { tasks },
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

    const previousStatus = task.status;
    const { status, progress, lat, lng, selfieUrl, rcaReason, rcaCategory } = req.body;

    // SC: Handle status transition timings and logic
    if (status && status !== previousStatus) {
      task.status = status;

      // Transition to In_Progress -> Start SLA tracking
      if (status === 'In_Progress') {
        task.slaStart = new Date();
      }

      // Rollback to lower states -> record Rework
      if (
        (previousStatus === 'Completed' || previousStatus === 'In_Progress') &&
        (status === 'Pending' || status === 'In_Progress')
      ) {
        task.reworkCount = (task.reworkCount || 0) + 1;
      }
    }

    if (progress !== undefined) {
      task.progress = Number(progress);
    }

    // Admin / Manager specific updates
    if (req.user?.role !== 'EMPLOYEE') {
      const updates = { ...req.body };
      delete updates.status;
      delete updates.progress;
      Object.assign(task, updates);
    }

    // Save RCA if provided when task is delayed or updating
    if (rcaReason && rcaCategory) {
      task.rca = {
        reason: rcaReason,
        category: rcaCategory,
        loggedAt: new Date(),
      };
    }

    // 4. Handle Task Completion Verifications
    if (status === 'Completed') {
      const completionLat = lat || req.body.geoVerified?.lat;
      const completionLng = lng || req.body.geoVerified?.lng;
      const completionSelfie = selfieUrl || req.body.geoVerified?.selfieUrl;

      let isSuspicious = false;
      const fraudFlags: string[] = [];

      // Check geo limits
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

      // 6. Gamification Rewards and accountability metrics
      if (task.assignedTo) {
        const assignee = await User.findById(task.assignedTo);
        if (assignee) {
          const xpGained = task.priority === 'High' ? 30 : task.priority === 'Medium' ? 20 : 10;
          assignee.xp = (assignee.xp || 0) + (isSuspicious ? 0 : xpGained);

          // Level Up check (100 XP per level threshold)
          const nextLevelThreshold = (assignee.level || 1) * 100;
          if (assignee.xp >= nextLevelThreshold) {
            assignee.level = (assignee.level || 1) + 1;
            // Unlock badges
            const currentBadges = assignee.badges || [];
            if (!currentBadges.includes('Task Warrior') && assignee.level >= 2) {
              currentBadges.push('Task Warrior');
            }
            if (!currentBadges.includes('Legend Performer') && assignee.level >= 5) {
              currentBadges.push('Legend Performer');
            }
            assignee.badges = currentBadges;
          }

          // Accountability calculations
          let currentAcc = assignee.accountabilityIndex || 100;
          if (slaBreached) currentAcc -= 5;
          if (task.reworkCount && task.reworkCount > 0) currentAcc -= 10;
          if (isSuspicious) currentAcc -= 25;
          assignee.accountabilityIndex = Math.max(20, Math.min(100, currentAcc));

          await assignee.save();
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

    // Soft delete action
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