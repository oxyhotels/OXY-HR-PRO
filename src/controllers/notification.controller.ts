import { Request, Response, NextFunction } from 'express';
import { Notification } from '@/models/Notification';
import { ApiError } from '@/utils/ApiError';

export const getNotifications = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) throw new ApiError(401, 'Unauthorized');

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const { search, moduleTag, priority, readStatus, dateRange } = req.query;

    const query: any = { recipient: req.user._id };

    if (moduleTag && moduleTag !== 'All') query.moduleTag = moduleTag;
    if (priority && priority !== 'All') query.priority = priority;
    if (readStatus === 'unread') query.read = false;
    if (readStatus === 'read') query.read = true;

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { message: { $regex: search, $options: 'i' } }
      ];
    }

    if (dateRange) {
      const now = new Date();
      if (dateRange === 'Today') {
        query.createdAt = { $gte: new Date(now.setHours(0,0,0,0)) };
      } else if (dateRange === 'This Week') {
        const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
        startOfWeek.setHours(0,0,0,0);
        query.createdAt = { $gte: startOfWeek };
      }
    }

    const notifications = await Notification.find(query)
      .populate('sender', 'firstName lastName photoUrl role department')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Notification.countDocuments(query);
    const unreadCount = await Notification.countDocuments({ recipient: req.user._id, read: false });

    res.status(200).json({
      status: 'success',
      data: {
        notifications,
        pagination: {
          total,
          page,
          pages: Math.ceil(total / limit),
          hasMore: skip + notifications.length < total
        },
        unreadCount
      },
    });
  } catch (error) {
    next(error);
  }
};

export const markAllAsRead = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) throw new ApiError(401, 'Unauthorized');

    await Notification.updateMany(
      { recipient: req.user._id, read: false },
      { read: true }
    );

    res.status(200).json({
      status: 'success',
      message: 'All notifications marked as read',
    });
  } catch (error) {
    next(error);
  }
};

export const markAsRead = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) throw new ApiError(401, 'Unauthorized');

    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipient: req.user._id },
      { read: true },
      { new: true }
    );

    if (!notification) {
      throw new ApiError(404, 'Notification not found');
    }

    res.status(200).json({
      status: 'success',
      data: { notification },
    });
  } catch (error) {
    next(error);
  }
};
