import { Request, Response, NextFunction } from 'express';
import { NotificationActivity } from '@/models/NotificationActivity';
import { resetActivity } from '@/utils/activityBadge';
import { ApiError } from '@/utils/ApiError';

export const getActivityBadges = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?._id;
    if (!userId) throw new ApiError(401, 'Unauthorized');

    const activities = await NotificationActivity.find({ userId, count: { $gt: 0 } });
    
    const badges = activities.reduce((acc, curr) => {
      acc[curr.module] = curr.count;
      return acc;
    }, {} as Record<string, number>);

    res.status(200).json({
      status: 'success',
      data: { badges }
    });
  } catch (error) {
    next(error);
  }
};

export const resetActivityBadge = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?._id;
    if (!userId) throw new ApiError(401, 'Unauthorized');

    const { module } = req.body;
    if (!module) throw new ApiError(400, 'Module is required');

    await resetActivity(userId, module);

    res.status(200).json({
      status: 'success',
      message: `Activity badge for ${module} reset`
    });
  } catch (error) {
    next(error);
  }
};
