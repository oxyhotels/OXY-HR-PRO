import { Request, Response, NextFunction } from 'express';
import { Task } from '@/models/Task';
import { User } from '@/models/User';
import { ApiError } from '@/utils/ApiError';
import { AuditLog } from '@/models/AuditLog';

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

// Accept Task
export const acceptTask = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { taskId } = req.params;
    const userId = (req as any).user._id;

    const task = await Task.findById(taskId);
    if (!task || task.isDeleted) throw new ApiError(404, 'Task not found');

    // Check if user is assigned
    const isAssigned = task.assignedTo?.includes(userId);
    if (!isAssigned) throw new ApiError(403, 'You are not assigned to this task');

    // Update status
    task.status = 'Accepted';
    task.acceptedAt = new Date();
    task.progress = 10;

    // Add response
    task.responses.push({
      userId,
      action: 'accepted',
      timestamp: new Date(),
    });

    await task.save();

    // Notify task creator
    await sendHindiNotification(
      task.assignedBy.toString(),
      taskId,
      '📌 कार्य स्वीकार किया गया',
      `कार्य "${task.title}" को ${(req as any).user.firstName} (${(req as any).user.role}) ने स्वीकार कर लिया है।`,
      'success'
    );

    await AuditLog.create({
      user: userId,
      hotel: task.hotel,
      action: 'TASK_ACCEPTED',
      module: 'TASK',
      details: `Task "${task.title}" accepted by user`,
    });

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
    const { taskId } = req.params;
    const { reason } = req.body;
    const userId = (req as any).user._id;

    if (!reason || reason.trim().length < 10) {
      throw new ApiError(400, 'Hold reason is required (minimum 10 characters)');
    }

    const task = await Task.findById(taskId);
    if (!task || task.isDeleted) throw new ApiError(404, 'Task not found');

    const isAssigned = task.assignedTo?.includes(userId);
    if (!isAssigned) throw new ApiError(403, 'You are not assigned to this task');

    // Update status
    task.status = 'On_Hold';

    // Add response
    task.responses.push({
      userId,
      action: 'held',
      reason: reason.trim(),
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
    const { taskId } = req.params;
    const { reason } = req.body;
    const userId = (req as any).user._id;

    if (!reason || reason.trim().length < 10) {
      throw new ApiError(400, 'Rejection reason is required (minimum 10 characters)');
    }

    const task = await Task.findById(taskId);
    if (!task || task.isDeleted) throw new ApiError(404, 'Task not found');

    const isAssigned = task.assignedTo?.includes(userId);
    if (!isAssigned) throw new ApiError(403, 'You are not assigned to this task');

    // Update status
    task.status = 'Rejected';

    // Add response
    task.responses.push({
      userId,
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
    const { taskId } = req.params;
    const { evidenceUrl, evidenceType, description } = req.body;
    const userId = (req as any).user._id;

    const task = await Task.findById(taskId);
    if (!task || task.isDeleted) throw new ApiError(404, 'Task not found');

    const isAssigned = task.assignedTo?.includes(userId);
    if (!isAssigned) throw new ApiError(403, 'You are not assigned to this task');

    // Check evidence requirement
    if (task.evidenceRequirement === 'mandatory' && !evidenceUrl) {
      throw new ApiError(400, 'कार्य पूरा करने के लिए फोटो अपलोड करना आवश्यक है।');
    }

    // Update status
    task.status = 'Completed';
    task.progress = 100;
    task.completedAt = new Date();

    if (evidenceUrl) {
      task.evidenceUrl = evidenceUrl;
      task.evidenceType = evidenceType || 'photo';
    }

    if (description) {
      task.description = task.description + '\n\nCompletion Note: ' + description;
    }

    // Add response
    task.responses.push({
      userId,
      action: 'completed',
      evidenceUrl,
      evidenceType: evidenceType || 'photo',
      timestamp: new Date(),
    });

    await task.save();

    // Notify task creator
    await sendHindiNotification(
      task.assignedBy.toString(),
      taskId,
      '✅ कार्य पूर्ण हो गया',
      `कार्य "${task.title}" को ${(req as any).user.firstName} ने पूर्ण कर दिया है।`,
      'success'
    );

    await AuditLog.create({
      user: userId,
      hotel: task.hotel,
      action: 'TASK_COMPLETED',
      module: 'TASK',
      details: `Task "${task.title}" completed`,
    });

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
    const { taskId } = req.params;

    const task = await Task.findById(taskId)
      .populate('responses.userId', 'firstName lastName email department designation')
      .populate('assignedTo', 'firstName lastName email department designation')
      .populate('assignedBy', 'firstName lastName email');

    if (!task || task.isDeleted) throw new ApiError(404, 'Task not found');

    res.status(200).json({
      status: 'success',
      data: { 
        task,
        responses: task.responses.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
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
    const user = await User.findById(userId);
    
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
    const acceptedTasks = await Task.countDocuments({ ...filter, status: 'Accepted' });
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
          accepted: { $sum: { $cond: [{ $eq: ['$status', 'Accepted'] }, 1, 0] } },
        },
      },
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        totalTasks,
        acceptedTasks,
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