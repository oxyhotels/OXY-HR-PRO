import { Request, Response, NextFunction } from 'express';
import { ApiError } from '@/utils/ApiError';
import { UserRole } from '@/models/User';

export const restrictTo = (...roles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new ApiError(401, 'Please authenticate'));
    }

    // Root Admin has master access to all operations/features
    if (req.user.role === 'ROOT_ADMIN') {
      return next();
    }

    if (!roles.includes(req.user.role)) {
      return next(
        new ApiError(403, `Permission denied: access restricted for role ${req.user.role}`)
      );
    }

    next();
  };
};
