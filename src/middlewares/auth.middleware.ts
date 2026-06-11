import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '@/config/config';
import { User } from '@/models/User';
import { ApiError } from '@/utils/ApiError';

interface DecodedToken {
  id: string;
  role: string;
  hotelId?: string;
  iat: number;
  exp: number;
}

export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let token: string | undefined;

    // Check header
    if (req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    } 
    // Check cookies
    else if (req.cookies?.accessToken) {
      token = req.cookies.accessToken;
    }

    if (!token) {
      throw new ApiError(401, 'Please authenticate - token missing');
    }

    // Verify token
    let decoded: DecodedToken;
    try {
      decoded = jwt.verify(token, config.jwt.secret) as DecodedToken;
    } catch (err) {
      throw new ApiError(401, 'Please authenticate - invalid or expired token');
    }

    // Find user
    const user = await User.findById(decoded.id);
    if (!user) {
      throw new ApiError(401, 'The user belonging to this token no longer exists');
    }

    if (user.status === 'Pending') {
      throw new ApiError(403, 'Your registration is pending approval');
    }

    if (user.status === 'Terminated') {
      throw new ApiError(403, 'Your account has been deactivated');
    }

    // Attach user to request
    req.user = user;
    
    // Attach tenantId to request
    if (user.hotel) {
      req.tenantId = user.hotel.toString();
    }

    next();
  } catch (error) {
    next(error);
  }
};
