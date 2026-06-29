import { Request, Response, NextFunction } from 'express';
import { Schema } from 'mongoose';
import { Task } from '@/models/Task';
import { User } from '@/models/User';
import { ApiError } from '@/utils/ApiError';
import { AuditLog } from '@/models/AuditLog';
import { getIO } from '@/lib/socket';
import { incrementActivity, incrementActivityForMany } from '@/utils/activityBadge';

const normalizeAssignedToIds = (assignedTo: any): string[] => {
  if (!assignedTo) return [];
  if (Array.isArray(assignedTo)) {
    return assignedTo.map((id) => id?.toString()).filter(Boolean);
  }
  return [assignedTo.toString()];
};

const isTaskAssignedToUser = (task: any, userId: string) => {
  return normalizeAssignedToIds(task.assignedTo).includes(userId.toString());
};

// Helper to send Hindi notifications
const sendHindiNotification = async (userId: string, taskId: string, title: string, message: string, type: 'info' | 'success' | 'warning') => {
  try {
    const { Notification } = await import('@/models/Notification');
    await Notification.create({
      user: userId,
      task: taskId,
      title,
      message,
      type,
      read: false,
    });
  } catch (error) {
    console.error('Failed to send notification:', error);
  }
};

// Helper to add task update entry
const addTaskUpdate = (task: any, user: any, status: string, remark?: string, progress?: number, evidenceUrl?: string) => {
  task.taskUpdates.push({
    status,
    description: remark || undefined,
    photoUrl: evidenceUrl || undefined,
    updatedBy: user?._id || user?.id,
    updatedByName: user ? `${user.firstName} ${user.lastName}` : 'System User',
    department: user?.department || '',
    designation: user?.designation || '',
    createdAt: new Date(),
  });
};

// Helper to emit real-time socket event
const emitTaskUpdate = (task: any, eventType: string) => {
  try {
    const io = getIO();
    if (io) {
      io.to('ROOT_ADMIN_ROOM').emit(eventType, { taskId: task._id, task });
      if (task.hotel) {
        io.to(`HOTEL_${task.hotel}`).emit(eventType, { taskId: task._id, task });
      }
    }
  } catch (error) {
    console.error('Socket emit error:', error);
  }
};

// Accept Task
export const acceptTask = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const taskId = req.params.taskId || req.params.id;
    const userId = (req as any).user._id.toString();
    const userName = (req as any).user.firstName 
      ? `${(req as any).user.firstName} ${(req as any).user.lastName}` 
      : 'User';

    const task = await Task.findById(taskId);
    if (!task || task.isDeleted) throw new ApiError(404, 'Task not found');
    
    const isAssigned = isTaskAssignedToUser(task, userId);
    if (!isAssigned) throw new ApiError(403, 'You are not assigned to this task');

    // Update status
    task.status = 'To_Do';
    task.acceptedAt = new Date();
    task.progress = 10;
    task.latestRemark = 'Task accepted';

    // Add to taskHistory
    task.taskHistory.push({
      action: 'Accepted',
      remark: 'Task accepted by employee',
      userId: (req as any).user._id,
      userName,
      timestamp: new Date()
    });

    // Add to taskUpdates array
    addTaskUpdate(task, (req as any).user, 'To_Do', 'Task accepted', 10);

    // Add response
    task.responses.push({
      userId: (req as any).user._id,
      action: 'accepted',
      timestamp: new Date(),
    });

    await task.save();

    // Notify task creator
    await sendHindiNotification(
      task.assignedBy.toString(),
      taskId,
      '📌 कार्य स्वीकार किया गया',
      `कार्य "${task.title}" को ${userName} ने स्वीकार कर लिया है।`,
      'success'
    );

    await AuditLog.create({
      user: userId,
      hotel: task.hotel,
      action: 'TASK_ACCEPTED',
      module: 'TASK',
      details: `Task "${task.title}" accepted by ${userName}`,
    });

    // Emit real-time update
    emitTaskUpdate(task, 'task_status_updated');

    res.status(200).json({
      status: 'success',
      data: { task },
    });
  } catch (error) {
    next(error);
  }
};

// Hold Task
export const holdTask = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const taskId = req.params.taskId || req.params.id;
    const { reason, photo } = req.body;
    const userId = (req as any).user._id.toString();
    const userName = (req as any).user.firstName 
      ? `${(req as any).user.firstName} ${(req as any).user.lastName}` 
      : 'User';

    if (!reason || !reason.trim()) {
      throw new ApiError(400, 'Hold reason is required');
    }

    const task = await Task.findById(taskId);
    if (!task || task.isDeleted) throw new ApiError(404, 'Task not found');

    const isAssigned = isTaskAssignedToUser(task, userId);
    if (!isAssigned) throw new ApiError(403, 'You are not assigned to this task');

    // Update status
    task.status = 'On_Hold';
    task.holdReason = reason.trim();
    task.latestRemark = reason.trim();

    // Auto-end active work session
    const activeSessionIndex = task.taskWorkSessions?.findIndex((s: any) => !s.endedAt);
    if (activeSessionIndex !== -1 && activeSessionIndex !== undefined) {
      const activeSession = task.taskWorkSessions[activeSessionIndex];
      const endedAt = new Date();
      activeSession.endedAt = endedAt;
      const diffMs = endedAt.getTime() - activeSession.startedAt.getTime();
      const durationMins = Math.floor(diffMs / 60000);
      activeSession.duration = durationMins;
      activeSession.updatedAt = new Date();
      task.totalWorkedMinutes = (task.totalWorkedMinutes || 0) + durationMins;
    }

    // Add to taskHistory
    task.taskHistory.push({
      action: 'Hold',
      remark: reason.trim(),
      userId: (req as any).user._id,
      userName,
      timestamp: new Date()
    });

    // Add to taskUpdates array
    addTaskUpdate(task, (req as any).user, 'On_Hold', reason.trim(), task.progress, photo);

    // Add response
    task.responses.push({
      userId: (req as any).user._id,
      action: 'held',
      reason: reason.trim(),
      evidenceUrl: photo,
      timestamp: new Date(),
    });

    await task.save();

    // Notify task creator
    await sendHindiNotification(
      task.assignedBy.toString(),
      taskId,
      '⏸️ कार्य होल्ड में है',
      `कार्य "${task.title}" को होल्ड कर दिया गया है।\nकारण: ${reason.trim()}`,
      'warning'
    );

    await AuditLog.create({
      user: userId,
      hotel: task.hotel,
      action: 'TASK_HOLD',
      module: 'TASK',
      details: `Task "${task.title}" put on hold. Reason: ${reason}`,
    });

    // Emit real-time update
    emitTaskUpdate(task, 'task_status_updated');

    res.status(200).json({
      status: 'success',
      data: { task },
    });
  } catch (error) {
    next(error);
  }
};

// Reject Task
export const rejectTask = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const taskId = req.params.taskId || req.params.id;
    const { reason } = req.body;
    const userId = (req as any).user._id.toString();
    const userName = (req as any).user.firstName 
      ? `${(req as any).user.firstName} ${(req as any).user.lastName}` 
      : 'User';

    if (!reason || !reason.trim()) {
      throw new ApiError(400, 'Rejection reason is required');
    }

    const task = await Task.findById(taskId);
    if (!task || task.isDeleted) throw new ApiError(404, 'Task not found');

    const isAssigned = isTaskAssignedToUser(task, userId);
    if (!isAssigned) throw new ApiError(403, 'You are not assigned to this task');

    // Update status
    task.status = 'Rejected';
    task.latestRemark = reason.trim();

    // Auto-end active work session
    const activeSessionIndex = task.taskWorkSessions?.findIndex((s: any) => !s.endedAt);
    if (activeSessionIndex !== -1 && activeSessionIndex !== undefined) {
      const activeSession = task.taskWorkSessions[activeSessionIndex];
      const endedAt = new Date();
      activeSession.endedAt = endedAt;
      const diffMs = endedAt.getTime() - activeSession.startedAt.getTime();
      const durationMins = Math.floor(diffMs / 60000);
      activeSession.duration = durationMins;
      activeSession.updatedAt = new Date();
      task.totalWorkedMinutes = (task.totalWorkedMinutes || 0) + durationMins;
    }

    // Add to taskHistory
    task.taskHistory.push({
      action: 'Rejected',
      remark: reason.trim(),
      userId: (req as any).user._id,
      userName,
      timestamp: new Date()
    });

    // Add to taskUpdates array
    addTaskUpdate(task, (req as any).user, 'Rejected', reason.trim(), task.progress);

    // Add response
    task.responses.push({
      userId: (req as any).user._id,
      action: 'rejected',
      reason: reason.trim(),
      timestamp: new Date(),
    });

    await task.save();

    // Notify task creator
    await sendHindiNotification(
      task.assignedBy.toString(),
      taskId,
      '❌ कार्य रिजेक्ट किया गया',
      `कार्य "${task.title}" को रिजेक्ट कर दिया गया है।\nकारण: ${reason.trim()}`,
      'info'
    );

    await AuditLog.create({
      user: userId,
      hotel: task.hotel,
      action: 'TASK_REJECTED',
      module: 'TASK',
      details: `Task "${task.title}" rejected. Reason: ${reason}`,
    });

    // Emit real-time update
    emitTaskUpdate(task, 'task_status_updated');

    res.status(200).json({
      status: 'success',
      data: { task },
    });
  } catch (error) {
    next(error);
  }
};

// Complete Task with Evidence
export const completeTask = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const taskId = req.params.taskId || req.params.id;
    const { evidenceUrl, evidenceType, description, photo } = req.body;
    const userId = (req as any).user._id.toString();
    const userName = (req as any).user.firstName 
      ? `${(req as any).user.firstName} ${(req as any).user.lastName}` 
      : 'User';

    const task = await Task.findById(taskId);
    if (!task || task.isDeleted) throw new ApiError(404, 'Task not found');

    const isAssigned = isTaskAssignedToUser(task, userId);
    if (!isAssigned) throw new ApiError(403, 'You are not assigned to this task');

    // Check evidence requirement
    if (task.evidenceRequirement === 'mandatory' && !evidenceUrl && !photo) {
      throw new ApiError(400, 'कार्य पूरा करने के लिए फोटो अपलोड करना आवश्यक है।');
    }

    // Update status
    task.status = 'Completed';
    task.progress = 100;
    task.completedAt = new Date();
    task.completionRemark = description || 'Task completed';
    task.latestRemark = description || 'Task completed';

    if (evidenceUrl || photo) {
      task.evidenceUrl = evidenceUrl || photo;
      task.evidenceType = evidenceType || 'photo';
    }

    // Auto-end active work session
    const activeSessionIndex = task.taskWorkSessions?.findIndex((s: any) => !s.endedAt);
    if (activeSessionIndex !== -1 && activeSessionIndex !== undefined) {
      const activeSession = task.taskWorkSessions[activeSessionIndex];
      const endedAt = new Date();
      activeSession.endedAt = endedAt;
      const diffMs = endedAt.getTime() - activeSession.startedAt.getTime();
      const durationMins = Math.floor(diffMs / 60000);
      activeSession.duration = durationMins;
      activeSession.updatedAt = new Date();
      task.totalWorkedMinutes = (task.totalWorkedMinutes || 0) + durationMins;
    }

    // Add to taskHistory
    task.taskHistory.push({
      action: 'Completed',
      remark: description || 'Task completed',
      userId: (req as any).user._id,
      userName,
      timestamp: new Date()
    });

    // Add to taskUpdates array
    addTaskUpdate(task, (req as any).user, 'Completed', description || 'Task completed', 100, evidenceUrl || photo);

    // Add response
    task.responses.push({
      userId: (req as any).user._id,
      action: 'completed',
      evidenceUrl: evidenceUrl || photo,
      evidenceType: evidenceType || 'photo',
      timestamp: new Date(),
    });

    await task.save();

    // Notify task creator
    await sendHindiNotification(
      task.assignedBy.toString(),
      taskId,
      '✅ कार्य पूर्ण हो गया',
      `कार्य "${task.title}" को ${userName} ने पूर्ण कर दिया है।`,
      'success'
    );

    await AuditLog.create({
      user: userId,
      hotel: task.hotel,
      action: 'TASK_COMPLETED',
      module: 'TASK',
      details: `Task "${task.title}" completed by ${userName}`,
    });

    // Emit real-time update
    emitTaskUpdate(task, 'task_status_updated');

    res.status(200).json({
      status: 'success',
      data: { task },
    });
  } catch (error) {
    next(error);
  }
};

// Resume Task from Hold
export const resumeTask = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const taskId = req.params.taskId || req.params.id;
    const { remark } = req.body;
    const userId = (req as any).user._id.toString();
    const userName = (req as any).user.firstName 
      ? `${(req as any).user.firstName} ${(req as any).user.lastName}` 
      : 'User';

    const task = await Task.findById(taskId);
    if (!task || task.isDeleted) throw new ApiError(404, 'Task not found');

    if (task.status !== 'On_Hold') {
      throw new ApiError(400, 'Only tasks on hold can be resumed');
    }

    const isAssigned = isTaskAssignedToUser(task, userId);
    if (!isAssigned) throw new ApiError(403, 'You are not assigned to this task');

    // Update status
    task.status = 'In_Progress';
    task.latestRemark = remark || 'Task resumed';

    // Add to taskHistory
    task.taskHistory.push({
      action: 'Resumed',
      remark: remark || 'Task resumed from hold',
      userId: (req as any).user._id,
      userName,
      timestamp: new Date()
    });

    // Add to taskUpdates array
    addTaskUpdate(task, (req as any).user, 'In_Progress', remark || 'Task resumed', task.progress);

    await task.save();

    // Notify task creator
    await sendHindiNotification(
      task.assignedBy.toString(),
      taskId,
      '▶️ कार्य फिर से शुरू किया गया',
      `कार्य "${task.title}" को फिर से शुरू कर दिया गया है।\n${remark ? `रemark: ${remark}` : ''}`,
      'info'
    );

    await AuditLog.create({
      user: userId,
      hotel: task.hotel,
      action: 'TASK_RESUMED',
      module: 'TASK',
      details: `Task "${task.title}" resumed from hold`,
    });

    // Emit real-time update
    emitTaskUpdate(task, 'task_status_updated');

    res.status(200).json({
      status: 'success',
      data: { task },
    });
  } catch (error) {
    next(error);
  }
};

// Update Task Progress
export const updateTaskProgress = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const taskId = req.params.taskId || req.params.id;
    const { progress, remark } = req.body;
    const userId = (req as any).user._id.toString();
    const userName = (req as any).user.firstName 
      ? `${(req as any).user.firstName} ${(req as any).user.lastName}` 
      : 'User';

    if (progress === undefined || progress === null) {
      throw new ApiError(400, 'Progress percentage is required');
    }

    const progressNum = Number(progress);
    if (isNaN(progressNum) || progressNum < 0 || progressNum > 100) {
      throw new ApiError(400, 'Progress must be between 0 and 100');
    }

    const task = await Task.findById(taskId);
    if (!task || task.isDeleted) throw new ApiError(404, 'Task not found');

    const isAssigned = isTaskAssignedToUser(task, userId);
    if (!isAssigned) throw new ApiError(403, 'You are not assigned to this task');

    // Auto-update status based on progress
    let newStatus = task.status;
    if (progressNum === 100) {
      newStatus = 'Completed';
      task.completedAt = new Date();
    } else if (progressNum > 0 && task.status === 'To_Do') {
      newStatus = 'In_Progress';
    }

    task.progress = progressNum;
    task.status = newStatus;
    task.latestRemark = remark || `Progress updated to ${progressNum}%`;

    // Auto-end active work session if task is being completed
    if (newStatus === 'Completed') {
      const activeSessionIndex = task.taskWorkSessions?.findIndex((s: any) => !s.endedAt);
      if (activeSessionIndex !== -1 && activeSessionIndex !== undefined) {
        const activeSession = task.taskWorkSessions[activeSessionIndex];
        const endedAt = new Date();
        activeSession.endedAt = endedAt;
        const diffMs = endedAt.getTime() - activeSession.startedAt.getTime();
        const durationMins = Math.floor(diffMs / 60000);
        activeSession.duration = durationMins;
        activeSession.updatedAt = new Date();
        task.totalWorkedMinutes = (task.totalWorkedMinutes || 0) + durationMins;
      }
    }

    // Add to taskHistory
    task.taskHistory.push({
      action: progressNum === 100 ? 'Completed' : 'Progress Updated',
      remark: remark || `Progress updated to ${progressNum}%`,
      userId: (req as any).user._id,
      userName,
      timestamp: new Date()
    });

    // Add to taskUpdates array
    addTaskUpdate(task, (req as any).user, newStatus, remark || `Progress: ${progressNum}%`, progressNum);

    await task.save();

    // Notify task creator if task is completed
    if (progressNum === 100) {
      await sendHindiNotification(
        task.assignedBy.toString(),
        taskId,
        '✅ कार्य पूर्ण हो गया',
        `कार्य "${task.title}" को ${userName} ने पूर्ण कर दिया है।`,
        'success'
      );
    }

    await AuditLog.create({
      user: userId,
      hotel: task.hotel,
      action: 'TASK_PROGRESS_UPDATED',
      module: 'TASK',
      details: `Task "${task.title}" progress updated to ${progressNum}%`,
    });

    // Emit real-time update
    emitTaskUpdate(task, 'task_status_updated');

    res.status(200).json({
      status: 'success',
      data: { task },
    });
  } catch (error) {
    next(error);
  }
};

// Get Task Responses/History
export const getTaskResponses = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const taskId = req.params.taskId || req.params.id;

    const task = await Task.findById(taskId)
      .populate('responses.userId', 'firstName lastName email department designation')
      .populate('assignedTo', 'firstName lastName email department designation')
      .populate('assignedBy', 'firstName lastName email role')
      .populate('taskUpdates.updatedBy', 'firstName lastName email role');

    if (!task || task.isDeleted) throw new ApiError(404, 'Task not found');

    res.status(200).json({
      status: 'success',
      data: { 
        task,
        responses: task.responses.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
        taskUpdates: task.taskUpdates.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get Task Analytics
export const getTaskAnalytics = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = (req as any).user._id;
    const user = await User.findById(userId).lean() as any;
    
    if (!user) throw new ApiError(404, 'User not found');

    let filter: any = { isDeleted: { $ne: true } };

    // ROOT_ADMIN sees all, others see their tasks
    if (user.role !== 'ROOT_ADMIN') {
      filter.hotel = user.hotel;
      filter.$or = [
        { assignedTo: userId },
        { assignedBy: userId },
      ];
    }

    const totalTasks = await Task.countDocuments(filter);
    const acceptedTasks = await Task.countDocuments({ ...filter, status: 'To_Do' });
    const inProgressTasks = await Task.countDocuments({ ...filter, status: 'In_Progress' });
    const completedTasks = await Task.countDocuments({ ...filter, status: 'Completed' });
    const rejectedTasks = await Task.countDocuments({ ...filter, status: 'Rejected' });
    const heldTasks = await Task.countDocuments({ ...filter, status: 'On_Hold' });
    const pendingTasks = await Task.countDocuments({ ...filter, status: 'Pending' });

    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    // Department-wise breakdown
    const deptStats = await Task.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$department',
          total: { $sum: 1 },
          completed: { $sum: { $cond: [{ $eq: ['$status', 'Completed'] }, 1, 0] } },
          inProgress: { $sum: { $cond: [{ $eq: ['$status', 'In_Progress'] }, 1, 0] } },
        },
      },
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        totalTasks,
        acceptedTasks,
        inProgressTasks,
        completedTasks,
        rejectedTasks,
        heldTasks,
        pendingTasks,
        completionRate,
        departmentStats: deptStats,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get My Tasks (for Employee Dashboard)
export const getMyTasks = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = (req as any).user._id.toString();
    const user = await User.findById(userId).lean() as any;
    
    if (!user) throw new ApiError(404, 'User not found');

    const filter: any = {
      isDeleted: { $ne: true },
      $or: [
        { assignedTo: userId }
      ]
    };

    if (user.department) {
      if (user.role !== 'ROOT_ADMIN') {
        filter.$or.push({
          assignedDepartments: user.department,
          hotel: user.hotel
        });
      } else {
        filter.$or.push({ assignedDepartments: user.department });
      }
    }

    const tasks = await Task.find(filter)
          .populate('hotel', 'name')
          .populate('assignedTo', 'firstName lastName email department designation')
          .populate('assignedBy', 'firstName lastName email role')
          .sort({ createdAt: -1 }).lean() as any;

    // Group tasks by status
    const groupedTasks = {
      todo: tasks.filter(t => t.status === 'To_Do' || t.status === 'Accepted'),
      inProgress: tasks.filter(t => t.status === 'In_Progress'),
      hold: tasks.filter(t => t.status === 'On_Hold'),
      completed: tasks.filter(t => t.status === 'Completed'),
      rejected: tasks.filter(t => t.status === 'Rejected'),
    };

    res.status(200).json({
      status: 'success',
      results: tasks.length,
      data: { 
        tasks,
        groupedTasks,
        counts: {
          todo: groupedTasks.todo.length,
          inProgress: groupedTasks.inProgress.length,
          hold: groupedTasks.hold.length,
          completed: groupedTasks.completed.length,
          rejected: groupedTasks.rejected.length,
        }
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get Task Monitoring Dashboard Data (for Root Admin)
export const getTaskMonitoringDashboard = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = (req as any).user;
    
    if (user.role !== 'ROOT_ADMIN') {
      throw new ApiError(403, 'Only Root Admin can access task monitoring dashboard');
    }

    let filter: any = { isDeleted: { $ne: true } };
    if (req.query.hotelId) {
      filter.hotel = req.query.hotelId;
    } else if (user.hotel) {
      filter.hotel = user.hotel;
    }

     const tasks = await Task.find(filter)
            .populate('assignedTo', 'firstName lastName email department designation photoUrl employeeId')
            .populate('assignedBy', 'firstName lastName email role')
           .sort({ updatedAt: -1 }).lean() as any;

    // Get latest update for each task
    const tasksWithLatestUpdate = tasks.map(task => {
      const latestUpdate = task.taskUpdates.length > 0 
        ? task.taskUpdates[task.taskUpdates.length - 1] 
        : null;
      
      return {
        ...task.toObject(),
        latestUpdate,
      };
    });

    // Calculate summary stats
    const summary = {
      total: tasks.length,
      todo: tasks.filter(t => t.status === 'To_Do' || t.status === 'Accepted').length,
      inProgress: tasks.filter(t => t.status === 'In_Progress').length,
      hold: tasks.filter(t => t.status === 'On_Hold').length,
      completed: tasks.filter(t => t.status === 'Completed').length,
      rejected: tasks.filter(t => t.status === 'Rejected').length,
    };

    res.status(200).json({
      status: 'success',
      data: {
        tasks: tasksWithLatestUpdate,
        summary,
      },
    });
  } catch (error) {
    next(error);
  }
};