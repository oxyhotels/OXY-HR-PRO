export const revalidate = 3600;
import { adaptRoute } from '@/lib/adaptRoute';
import { User } from '@/models/User';
import { Request, Response, NextFunction } from 'express';

const getPublicManagers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Find users who are managers (HOTEL_ADMIN or DEPT_MANAGER or HR_MANAGER or ROOT_ADMIN if needed)
    const managers = await User.find({
      role: { $in: ['HOTEL_ADMIN', 'HR_MANAGER', 'DEPT_MANAGER'] },
      status: { $ne: 'Inactive' }
    })
      .select('_id firstName lastName designation department employeeId employeeCode managerCode hotel')
      .populate('hotel', 'name')
      .lean();

    res.status(200).json({
      status: 'success',
      data: { managers },
    });
  } catch (error) {
    next(error);
  }
};

export const GET = adaptRoute(getPublicManagers);
