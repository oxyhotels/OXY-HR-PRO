import { Request, Response, NextFunction } from 'express';
import { SocialPost } from '@/models/SocialPost';
import { ApiError } from '@/utils/ApiError';
import { AuditLog } from '@/models/AuditLog';

// GET /api/community/social
export const getSocialPosts = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const hotelId = req.user?.hotel;
    if (!hotelId && req.user?.role !== 'ROOT_ADMIN') {
      throw new ApiError(400, 'User is not mapped to any hotel tenant');
    }

    const filter: any = {};
    if (req.user?.role !== 'ROOT_ADMIN') {
      filter.hotel = hotelId;
    }

    const posts = await SocialPost.find(filter)
      .populate('author', 'firstName lastName photoUrl role department designation')
      .populate('comments.user', 'firstName lastName photoUrl role department')
      .sort({ createdAt: -1 });

    res.status(200).json({
      status: 'success',
      data: { posts }
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/community/social
export const createSocialPost = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { content, mediaUrls, mediaType, achievement } = req.body;
    const hotelId = req.user?.hotel;
    if (!hotelId) {
      throw new ApiError(400, 'User is not mapped to any hotel tenant');
    }

    const userId = req.user?._id;
    if (!userId) throw new ApiError(401, 'Unauthorized');

    const post = await SocialPost.create({
      author: userId,
      hotel: hotelId,
      content,
      mediaUrls,
      mediaType: mediaType || 'none',
      achievement
    });

    const populatedPost = await SocialPost.findById(post._id)
      .populate('author', 'firstName lastName photoUrl role department designation');

    // Logging Audit Trail
    await AuditLog.create({
      user: userId,
      hotel: hotelId,
      action: 'CREATE_SOCIAL_POST',
      module: 'COMMUNITY',
      details: `Created social post: "${content.substring(0, 30)}..."`
    });

    res.status(201).json({
      status: 'success',
      data: { post: populatedPost }
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/community/social/:id/react
export const reactSocialPost = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id: postId } = req.params;
    const { type } = req.body; // 'like' | 'celebrate' | 'love' | 'insightful'
    const userId = req.user?._id;
    if (!userId) throw new ApiError(401, 'Unauthorized');

    const post = await SocialPost.findById(postId);
    if (!post) throw new ApiError(404, 'Social post not found');

    const reactionIdx = post.reactions.findIndex((r: any) => r.user.toString() === userId.toString());

    if (reactionIdx > -1) {
      if (post.reactions[reactionIdx].type === type) {
        // Toggle removal if active
        post.reactions.splice(reactionIdx, 1);
      } else {
        // Swap reaction
        post.reactions[reactionIdx].type = type;
      }
    } else {
      post.reactions.push({ user: userId, type });
    }

    await post.save();

    const populatedPost = await SocialPost.findById(postId)
      .populate('author', 'firstName lastName photoUrl role department designation')
      .populate('comments.user', 'firstName lastName photoUrl role department');

    res.status(200).json({
      status: 'success',
      data: { post: populatedPost }
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/community/social/:id/comment
export const commentSocialPost = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id: postId } = req.params;
    const { content } = req.body;
    const userId = req.user?._id;
    if (!userId) throw new ApiError(401, 'Unauthorized');

    if (!content) throw new ApiError(400, 'Comment content is required');

    const post = await SocialPost.findByIdAndUpdate(
      postId,
      {
        $push: { comments: { user: userId, content, createdAt: new Date() } }
      },
      { new: true }
    )
    .populate('author', 'firstName lastName photoUrl role department designation')
    .populate('comments.user', 'firstName lastName photoUrl role department');

    if (!post) throw new ApiError(404, 'Social post not found');

    res.status(200).json({
      status: 'success',
      data: { post }
    });
  } catch (error) {
    next(error);
  }
};
