import { Request, Response, NextFunction } from 'express';
import { CommunityGroup } from '@/models/CommunityGroup';
import { CommunityMessage } from '@/models/CommunityMessage';
import { User } from '@/models/User';
import { AuditLog } from '@/models/AuditLog';
import { ApiError } from '@/utils/ApiError';
import mongoose from 'mongoose';

// Sync Global Group so everyone is a member
const ensureGlobalGroup = async (): Promise<any> => {
  let globalGroup = await CommunityGroup.findOne({ type: 'GlobalGroup' });
  
  // Find all active users
  const allUsers = await User.find({ status: { $ne: 'Terminated' } }, '_id');
  const membersList = allUsers.map((u) => ({
    user: u._id,
    role: 'member' as const,
    joinedAt: new Date()
  }));

  if (!globalGroup) {
    globalGroup = await CommunityGroup.create({
      name: 'OXY Global Community',
      type: 'GlobalGroup',
      description: 'Global corporate communication hub for all OXY Hotels employees, departments, and management.',
      members: membersList
    });
    console.log('[Community] Seeded Global Group.');
  } else {
    // Proactively sync members if new users registered
    const existingUserIds = new Set(globalGroup.members.map((m: any) => m.user.toString()));
    const missingMembers = membersList.filter((m) => !existingUserIds.has(m.user.toString()));
    
    if (missingMembers.length > 0) {
      await CommunityGroup.findByIdAndUpdate(globalGroup._id, {
        $push: { members: { $each: missingMembers } }
      });
      console.log(`[Community] Synced ${missingMembers.length} new members to Global Group.`);
    }
  }
  return globalGroup;
};

// GET /api/community/groups
export const getGroups = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?._id;
    if (!userId) throw new ApiError(401, 'Unauthorized');

    // Sync global group first
    await ensureGlobalGroup();

    const query: any = {};

    // Multi-tenant containment
    if (req.user?.role !== 'ROOT_ADMIN') {
      const userHotel = req.user?.hotel;
      query.$or = [
        { type: 'GlobalGroup' }, // Global is system-wide
        { 
          hotel: userHotel,
          $or: [
            { type: 'PublicGroup' },
            { type: 'AnnouncementChannel' },
            { 'members.user': userId },
            { type: 'DepartmentGroup', department: req.user?.department }
          ]
        }
      ];
    }

    const groups = await CommunityGroup.find(query)
      .populate('createdBy', 'firstName lastName role')
      .populate('members.user', 'firstName lastName photoUrl role department status')
      .sort({ updatedAt: -1 });

    res.status(200).json({
      status: 'success',
      data: { groups }
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/community/groups
export const createGroup = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, type, description, department, memberIds } = req.body;
    
    // RBAC: Only Root Admin, Hotel Admin or HR Manager can create groups/channels
    const allowedRoles = ['ROOT_ADMIN', 'HOTEL_ADMIN', 'HR_MANAGER'];
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      throw new ApiError(403, 'Access denied: Insufficient privileges to create groups');
    }

    let hotelId = req.user?.hotel;
    if (req.user.role === 'ROOT_ADMIN' && req.body.hotelId) {
      hotelId = req.body.hotelId;
    }

    const membersList = (memberIds || []).map((mId: string) => ({
      user: new mongoose.Types.ObjectId(mId),
      role: 'member' as const,
      joinedAt: new Date()
    }));

    // Creator is Admin member
    membersList.push({
      user: req.user._id,
      role: 'admin' as const,
      joinedAt: new Date()
    });

    const group = await CommunityGroup.create({
      name,
      type,
      description,
      hotel: hotelId,
      department: type === 'DepartmentGroup' ? department : undefined,
      createdBy: req.user._id,
      members: membersList
    });

    // Logging Audit Trail
    await AuditLog.create({
      user: req.user._id,
      hotel: hotelId,
      action: 'CREATE_GROUP',
      module: 'COMMUNITY',
      details: `Created community group "${name}" of type ${type}`
    });

    res.status(201).json({
      status: 'success',
      data: { group }
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/community/groups/:id/messages
export const getGroupMessages = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id: groupId } = req.params;
    const page = parseInt(req.query.page as string || '1', 10);
    const limit = parseInt(req.query.limit as string || '50', 10);
    const skip = (page - 1) * limit;

    const messages = await CommunityMessage.find({ group: groupId })
      .populate('sender', 'firstName lastName photoUrl role department')
      .populate('parentMessage')
      .populate('appreciation.recipient', 'firstName lastName photoUrl role department')
      .sort({ createdAt: 1 }) // Chronological order
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      status: 'success',
      results: messages.length,
      data: { messages }
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/community/groups/:id/messages
export const sendMessage = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id: groupId } = req.params;
    const { 
      content, 
      parentMessage, 
      forwardedFrom, 
      attachments, 
      poll, 
      event, 
      voiceNote, 
      videoMessage, 
      appreciation 
    } = req.body;

    const group = await CommunityGroup.findById(groupId);
    if (!group) throw new ApiError(404, 'Community group not found');

    // Announcement Check: Only Admin, Director, or Manager can post
    if (group.type === 'AnnouncementChannel') {
      const allowedRoles = ['ROOT_ADMIN', 'HOTEL_ADMIN', 'HR_MANAGER', 'DEPT_MANAGER'];
      if (!req.user || !allowedRoles.includes(req.user.role)) {
        throw new ApiError(403, 'Permission denied: Employees cannot send messages in announcement channels');
      }
    }

    const message = await CommunityMessage.create({
      group: groupId,
      sender: req.user?._id,
      content,
      parentMessage,
      forwardedFrom,
      attachments,
      poll,
      event,
      voiceNote,
      videoMessage,
      appreciation
    });

    // Populate sender details for socket or json return
    const populatedMessage = await CommunityMessage.findById(message._id)
      .populate('sender', 'firstName lastName photoUrl role department')
      .populate('parentMessage')
      .populate('appreciation.recipient', 'firstName lastName photoUrl role department');

    // Update group timestamp
    await CommunityGroup.findByIdAndUpdate(groupId, { updatedAt: new Date() });

    // Realtime Socket Broadcast
    if ((global as any).io) {
      (global as any).io.to(`group_${groupId}`).emit('new_message', populatedMessage);
    }

    res.status(201).json({
      status: 'success',
      data: { message: populatedMessage }
    });
  } catch (error) {
    next(error);
  }
};

// PUT /api/community/messages/:messageId
export const editMessage = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { messageId } = req.params;
    const { content } = req.body;

    const message = await CommunityMessage.findById(messageId);
    if (!message) throw new ApiError(404, 'Message not found');

    if (message.sender.toString() !== req.user?._id.toString()) {
      throw new ApiError(403, 'Access denied: You can only edit your own messages');
    }

    message.content = content;
    message.isEdited = true;
    await message.save();

    const populatedMessage = await CommunityMessage.findById(messageId)
      .populate('sender', 'firstName lastName photoUrl role department')
      .populate('parentMessage');

    // Realtime Socket Broadcast
    if ((global as any).io && populatedMessage) {
      (global as any).io.to(`group_${populatedMessage.group.toString()}`).emit('message_updated', populatedMessage);
    }

    res.status(200).json({
      status: 'success',
      data: { message: populatedMessage }
    });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/community/messages/:messageId
export const deleteMessage = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { messageId } = req.params;

    const message = await CommunityMessage.findById(messageId);
    if (!message) throw new ApiError(404, 'Message not found');

    // Allow deleting if user is sender OR user is an Admin
    const isSender = message.sender.toString() === req.user?._id.toString();
    const isAdmin = ['ROOT_ADMIN', 'HOTEL_ADMIN'].includes(req.user?.role || '');

    if (!isSender && !isAdmin) {
      throw new ApiError(403, 'Permission denied: Cannot delete other user messages');
    }

    message.content = 'This message was deleted';
    message.isDeleted = true;
    message.attachments = [];
    message.poll = undefined;
    message.event = undefined;
    message.voiceNote = undefined;
    message.videoMessage = undefined;
    message.appreciation = undefined;
    await message.save();

    // Realtime Socket Broadcast
    if ((global as any).io) {
      (global as any).io.to(`group_${message.group.toString()}`).emit('message_deleted', messageId);
    }

    res.status(200).json({
      status: 'success',
      data: { message }
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/community/messages/:messageId/react
export const reactToMessage = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { messageId } = req.params;
    const { emoji } = req.body;
    const userId = req.user?._id;
    if (!userId) throw new ApiError(401, 'Unauthorized');

    const message = await CommunityMessage.findById(messageId);
    if (!message) throw new ApiError(404, 'Message not found');

    // Toggle reaction
    const existingIdx = message.reactions.findIndex((r: any) => r.user.toString() === userId.toString());
    
    if (existingIdx > -1) {
      if (message.reactions[existingIdx].emoji === emoji) {
        // Remove reaction
        message.reactions.splice(existingIdx, 1);
      } else {
        // Swap reaction
        message.reactions[existingIdx].emoji = emoji;
      }
    } else {
      // Add reaction
      message.reactions.push({ user: userId, emoji });
    }

    await message.save();

    const populated = await CommunityMessage.findById(messageId)
      .populate('sender', 'firstName lastName photoUrl role department')
      .populate('parentMessage');

    // Realtime Socket Broadcast
    if ((global as any).io && populated) {
      (global as any).io.to(`group_${populated.group.toString()}`).emit('message_updated', populated);
    }

    res.status(200).json({
      status: 'success',
      data: { message: populated }
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/community/messages/:messageId/vote
export const votePollOption = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { messageId } = req.params;
    const { optionIndex } = req.body; // 0-based index of chosen option
    const userId = req.user?._id;
    if (!userId) throw new ApiError(401, 'Unauthorized');

    const message = await CommunityMessage.findById(messageId);
    if (!message || !message.poll) throw new ApiError(404, 'Poll not found');

    // Remove user's previous votes to allow single selection
    message.poll.options.forEach((opt: any) => {
      opt.votes = opt.votes.filter((vId: any) => vId.toString() !== userId.toString());
    });

    // Add new vote
    message.poll.options[optionIndex].votes.push(userId);
    await message.save();

    const populated = await CommunityMessage.findById(messageId)
      .populate('sender', 'firstName lastName photoUrl role department');

    // Realtime Socket Broadcast
    if ((global as any).io && populated) {
      (global as any).io.to(`group_${populated.group.toString()}`).emit('message_updated', populated);
    }

    res.status(200).json({
      status: 'success',
      data: { message: populated }
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/community/analytics
export const getCommunityAnalytics = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const filter: any = {};
    if (req.user?.role !== 'ROOT_ADMIN') {
      filter.hotel = req.user?.hotel;
    }

    // Load matching groups
    const groups = await CommunityGroup.find(filter);
    const groupIds = groups.map((g) => g._id);

    const totalMessages = await CommunityMessage.countDocuments({ group: { $in: groupIds } });
    const activeUsers = await CommunityMessage.distinct('sender', { group: { $in: groupIds } });

    // Group message frequency breakdown
    const groupActivity = await CommunityMessage.aggregate([
      { $match: { group: { $in: groupIds } } },
      { $group: { _id: '$group', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // Active Employees ranking
    const activeEmployees = await CommunityMessage.aggregate([
      { $match: { group: { $in: groupIds } } },
      { $group: { _id: '$sender', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);

    // Populate active employee details
    const populatedEmployees = await User.populate(activeEmployees, {
      path: '_id',
      select: 'firstName lastName department designation photoUrl'
    });

    res.status(200).json({
      status: 'success',
      data: {
        totalMessages,
        activeUsersCount: activeUsers.length,
        groupActivity,
        mostActiveEmployees: populatedEmployees
      }
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/community/calls/audio / video / meeting (Calls Stubs)
export const createCallToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { channelName, callType } = req.body;
    res.status(200).json({
      status: 'success',
      data: {
        channelName,
        callType,
        token: `rtc_token_mock_${Math.random().toString(36).substring(7)}`,
        appId: 'mock_app_id_value_for_future_ready_agora',
        uid: Math.floor(Math.random() * 100000)
      }
    });
  } catch (error) {
    next(error);
  }
};
