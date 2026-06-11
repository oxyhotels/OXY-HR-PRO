import { Request, Response, NextFunction } from 'express';

// Next.js rate limiting logic
const ipCache = new Map<string, { count: number; resetTime: number }>();

export const authRateLimiter = (req: Request, res: Response, next: NextFunction): void => {
  const ip = req.ip || '127.0.0.1';
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minutes
  const max = 50; // 50 attempts

  let limitData = ipCache.get(ip);
  if (!limitData || now > limitData.resetTime) {
    limitData = { count: 0, resetTime: now + windowMs };
  }

  limitData.count++;
  ipCache.set(ip, limitData);

  if (limitData.count > max) {
    res.status(429).json({
      status: 'error',
      message: 'Too many authentication attempts from this IP, please try again after 15 minutes',
    });
    return;
  }

  next();
};
