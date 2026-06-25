import { Request, Response, NextFunction } from 'express';
import { Task } from '@/models/Task';
import { ApiError } from '@/utils/ApiError';
import { getIO } from '@/lib/socket';
import { User } from '@/models/User';

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

export const handleWorkSession = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const taskId = req.params.id;
    const { action, updateMessage, evidenceImage } = req.body;
    const userId = (req as any).user._id.toString();

    const task = await Task.findById(taskId);
    if (!task) {
      throw new ApiError(404, 'Task not found');
    }

    if (task.status !== 'In_Progress') {
      throw new ApiError(400, 'Work sessions can only be tracked for IN-PROGRESS tasks');
    }

    if (action === 'start') {
      const hasActiveSession = task.taskWorkSessions?.some((s: any) => !s.endedAt);
      if (hasActiveSession) {
        throw new ApiError(400, 'A work session is already active');
      }

      if (!task.taskWorkSessions) {
        task.taskWorkSessions = [];
      }

      task.taskWorkSessions.push({
        startedAt: new Date(),
        updatedBy: userId,
        updatedAt: new Date()
      });

      await task.save();
      emitTaskUpdate(task, 'TASK_UPDATED');
      res.status(200).json({ success: true, message: 'Work session started', task });
      return;
    }

    if (action === 'pause') {
      const activeSessionIndex = task.taskWorkSessions?.findIndex((s: any) => !s.endedAt);
      if (activeSessionIndex === -1 || activeSessionIndex === undefined) {
        throw new ApiError(400, 'No active work session found to pause');
      }

      const activeSession = task.taskWorkSessions[activeSessionIndex];
      const endedAt = new Date();
      activeSession.endedAt = endedAt;
      
      const diffMs = endedAt.getTime() - activeSession.startedAt.getTime();
      const durationMins = Math.floor(diffMs / 60000);
      
      activeSession.duration = durationMins;
      activeSession.updateMessage = updateMessage;
      activeSession.evidenceImage = evidenceImage;
      activeSession.updatedAt = new Date();

      task.totalWorkedMinutes = (task.totalWorkedMinutes || 0) + durationMins;
      if (updateMessage) {
        task.latestUpdate = updateMessage;
      }

      await task.save();
      emitTaskUpdate(task, 'TASK_UPDATED');
      res.status(200).json({ success: true, message: 'Work session paused and saved', task });
      return;
    }

    throw new ApiError(400, 'Invalid action');
  } catch (error) {
    next(error);
  }
};
