import { Request, Response, NextFunction } from 'express';
import { Task } from '@/models/Task';
import { User } from '@/models/User';
import { ApiError } from '@/utils/ApiError';
import { AuditLog } from '@/models/AuditLog';
import { getIO } from '@/lib/socket';

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

// Update Task Status
export const updateTaskStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const taskId = req.params.id;
    const { status, description, reason, photoUrl } = req.body;
    const userId = (req as any).user._id.toString();
    const user = await User.findById(userId);
    
    if (!user) throw new ApiError(404, 'User not found');

    const validStatuses = ['In_Progress', 'On_Hold', 'Completed', 'Rejected'];
    if (!validStatuses.includes(status)) {
      throw new ApiError(400, 'Invalid status. Allowed: In_Progress, On_Hold, Completed, Rejected');
    }

    const task = await Task.findById(taskId);
    if (!task || task.isDeleted) throw new ApiError(404, 'Task not found');

    // Check if user is assigned to this task
    const isAssigned = Array.isArray(task.assignedTo) 
      ? task.assignedTo.some((id: any) => id.toString() === userId)
      : task.assignedTo?.toString() === userId;
    
    if (!isAssigned) {
      throw new ApiError(403, 'You are not authorized to update this task');
    }

    // Validation based on status
    if (status === 'On_Hold' && (!reason || !reason.trim())) {
      throw new ApiError(400, 'Hold reason is required');
    }

    if (status === 'Rejected' && (!reason || !reason.trim())) {
      throw new ApiError(400, 'Rejection reason is required');
    }

    if (status === 'Completed') {
      if (task.evidenceRequirement === 'mandatory' && !photoUrl) {
        throw new ApiError(400, 'Photo upload is mandatory for this task');
      }
      if (!description || description.trim().length < 5) {
        throw new ApiError(400, 'Completion summary is required (minimum 5 characters)');
      }
    }

    if (status === 'In_Progress' && (!description || description.trim().length < 5)) {
      throw new ApiError(400, 'Work update description is required (minimum 5 characters)');
    }

    // Update task status
    const previousStatus = task.status;
    task.status = status;
    task.latestRemark = description || reason || '';

    if (status === 'Completed') {
      task.completedAt = new Date();
      task.progress = 100;
      if (photoUrl) {
        task.evidenceUrl = photoUrl;
        task.evidenceType = 'photo';
      }
    }

    if (status === 'In_Progress') {
      task.progress = Math.max(task.progress, 25);
    }

    // Auto-end active work session if task is being completed, held, or rejected
    if (status === 'Completed' || status === 'On_Hold' || status === 'Rejected') {
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

    // Add to taskUpdates array
    task.taskUpdates.push({
      status,
      description: description || undefined,
      reason: reason || undefined,
      photoUrl: photoUrl || undefined,
      updatedBy: user._id,
      updatedByName: `${user.firstName} ${user.lastName}`,
      department: user.department || '',
      designation: user.designation || '',
      createdAt: new Date(),
    });

    // Add to taskHistory
    task.taskHistory.push({
      action: status === 'In_Progress' ? 'Progress Updated' : status,
      remark: description || reason || `Status updated to ${status}`,
      userId: user._id,
      userName: `${user.firstName} ${user.lastName}`,
      timestamp: new Date(),
    });

    await task.save();

    // Notify task creator
    await sendHindiNotification(
      task.assignedBy.toString(),
      taskId,
      status === 'Completed' ? '✅ कार्य पूर्ण हो गया' :
        status === 'On_Hold' ? '⏸️ कार्य होल्ड में है' :
        status === 'Rejected' ? '❌ कार्य रिजेक्ट किया गया' :
        '🔄 कार्य स्टेटस अपडेट',
      `कार्य "${task.title}" का स्टेटस अपडेट किया गया है।`,
      status === 'Completed' ? 'success' : status === 'On_Hold' ? 'warning' : 'info'
    );

    await AuditLog.create({
      user: userId,
      hotel: task.hotel,
      action: `TASK_${status.toUpperCase()}`,
      module: 'TASK',
      details: `Task "${task.title}" status updated to ${status}`,
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