import { Request, Response, NextFunction } from 'express';
import { Policy } from '@/models/Policy';
import { ApiError } from '@/utils/ApiError';

export const getPolicies = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const policies = await Policy.find();
    res.status(200).json({
      status: 'success',
      data: { policies },
    });
  } catch (error) {
    next(error);
  }
};

export const createPolicy = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { title, content, fileUrl } = req.body;
    const policy = await Policy.create({
      title,
      content,
      fileUrl,
      signedByUsers: [],
    });

    res.status(201).json({
      status: 'success',
      data: { policy },
    });
  } catch (error) {
    next(error);
  }
};

export const signPolicy = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const policy = await Policy.findById(req.params.id);
    if (!policy) {
      throw new ApiError(404, 'Policy not found');
    }

    // Check if already signed
    const alreadySigned = policy.signedByUsers.some(
      (s: any) => s.user.toString() === req.user?._id.toString()
    );

    if (alreadySigned) {
      res.status(200).json({
        status: 'success',
        message: 'Policy already signed',
        data: { policy },
      });
      return;
    }

    policy.signedByUsers.push({
      user: req.user?._id as any,
      signedAt: new Date(),
    });

    await policy.save();

    res.status(200).json({
      status: 'success',
      message: 'Policy signed successfully',
      data: { policy },
    });
  } catch (error) {
    next(error);
  }
};
