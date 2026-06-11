import { Request, Response, NextFunction } from 'express';
import { Task } from '@/models/Task';
import { User } from '@/models/User';
import { ApiError } from '@/utils/ApiError';
import { AuditLog } from '@/models/AuditLog';

export const createTask = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { title, description, assignedTo, priority, dueDate, department } = req.body;

    let hotelId = req.user?.hotel;
    if (req.user?.role === 'ROOT_ADMIN') {
      // 1. Resolve hotel context from target user if assignedTo is provided
      if (assignedTo) {
        const assignee = await User.findById(assignedTo);
        if (assignee && assignee.hotel) {
          hotelId = assignee.hotel;
        }
      }
      // 2. Fallback to explicit hotelId in body (useful for department/global assignments)
      if (!hotelId) {
        hotelId = req.body.hotelId;
      }
      if (!hotelId) throw new ApiError(400, 'hotelId is required for ROOT_ADMIN');
    }

    if (!hotelId) throw new ApiError(400, 'Tenancy resolve error');

    // Scoping check: employees can only assign tasks to themselves.
    // If assignedTo is not provided, and no department is specified, default to self-assignment.
    let targetAssignee = assignedTo || undefined;
    if (req.user?.role === 'EMPLOYEE') {
      targetAssignee = req.user._id;
    } else if (!targetAssignee && !department) {
      targetAssignee = req.user?._id;
    }

    const task = await Task.create({
      title,
      description,
      hotel: hotelId,
      assignedTo: targetAssignee,
      assignedBy: req.user?._id,
      priority,
      dueDate,
      status: 'Todo',
      progress: 0,
      department: department || undefined,
    });

    await AuditLog.create({
      user: req.user?._id,
      hotel: hotelId,
      action: 'CREATE_TASK',
      module: 'TASK',
      details: `Task "${title}" created and assigned to ${assignedTo}`,
    });

    res.status(201).json({
      status: 'success',
      data: { task },
    });
  } catch (error) {
    next(error);
  }
};

export const getTasks = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const filter: any = {};

    // Tenancy Check
    if (req.user?.role !== 'ROOT_ADMIN') {
      filter.hotel = req.user?.hotel;
    } else if (req.query.hotelId) {
      filter.hotel = req.query.hotelId;
    }

    if (req.query.status) {
      filter.status = req.query.status;
    }

    // Role-specific scoping:
    if (req.user?.role !== 'ROOT_ADMIN') {
      // Find all ROOT_ADMIN users
      const rootAdmins = await User.find({ role: 'ROOT_ADMIN' }).select('_id');
      const rootAdminIds = rootAdmins.map(r => r._id);

      const orConditions: any[] = [
        { assignedTo: req.user?._id },
        { assignedTo: { $exists: false } },
        { assignedTo: null },
        { assignedBy: { $in: rootAdminIds } }
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
      .populate('assignedTo', 'firstName lastName email department designation')
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
    if (!task) throw new ApiError(404, 'Task not found');

    // Tenancy check
    if (req.user?.role !== 'ROOT_ADMIN' && task.hotel.toString() !== req.user?.hotel?.toString()) {
      throw new ApiError(403, 'Unauthorized');
    }

    // Role permission verification:
    // Employees can only update task status & progress. Admins/Managers can edit everything.
    if (req.user?.role === 'EMPLOYEE') {
      if (task.assignedTo.toString() !== req.user._id.toString()) {
        throw new ApiError(403, 'You can only update tasks assigned to yourself');
      }
      
      const { status, progress } = req.body;
      if (status) task.status = status;
      if (progress !== undefined) task.progress = progress;
    } else {
      // Admin / Managers can edit everything
      const updates = req.body;
      Object.assign(task, updates);
    }

    await task.save();

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
    if (!task) throw new ApiError(404, 'Task not found');

    if (req.user?.role !== 'ROOT_ADMIN' && task.hotel.toString() !== req.user?.hotel?.toString()) {
      throw new ApiError(403, 'Unauthorized');
    }

    await Task.findByIdAndDelete(req.params.id);

    await AuditLog.create({
      user: req.user?._id,
      hotel: task.hotel,
      action: 'DELETE_TASK',
      module: 'TASK',
      details: `Task "${task.title}" deleted`,
    });

    res.status(204).json({
      status: 'success',
      data: null,
    });
  } catch (error) {
    next(error);
  }
};
