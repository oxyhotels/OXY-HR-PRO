import { Request, Response, NextFunction } from 'express';
import { CommunityGroup } from '@/models/CommunityGroup';
import { CommunityMessage } from '@/models/CommunityMessage';
import { User } from '@/models/User';
import { AuditLog } from '@/models/AuditLog';
import { ApiError } from '@/utils/ApiError';
import { CallSession } from '@/models/CallSession';
import { Notification } from '@/models/Notification';
import { getIO } from '@/lib/socket';
import { incrementActivityForMany } from '@/utils/activityBadge';
import mongoose from 'mongoose';
import { PushToken } from '@/models/PushToken';
import { CallLog } from '@/models/CallLog';
import { VideoCallLog } from '@/models/VideoCallLog';
import { ReadStatus } from '@/models/ReadStatus';
import { DeliveryStatus } from '@/models/DeliveryStatus';
import { sendPushNotification } from '@/services/fcm.service';
import { createNotification } from '@/services/notification.service';

// Add a single user to the OXY Global Community group (idempotent)
export const addUserToGlobalGroup = async (userId: any): Promise<void> => {
  try {
    let globalGroup = await CommunityGroup.findOne({ type: 'GlobalGroup' }) as any;
    if (!globalGroup) {
      // Create global group if missing
      globalGroup = await CommunityGroup.create({
        name: 'OXY Global Community',
        type: 'GlobalGroup',
        description: 'Global corporate communication hub for all OXY Hotels employees, departments, and management.',
        members: [{ user: userId, role: 'member', joinedAt: new Date() }]
      });
      console.log('[Community] Created Global Group and added first user.');
      return;
    }
    // Idempotent: only add if not already a member
    const alreadyMember = globalGroup.members.some((m: any) => m.user.toString() === userId.toString());
    if (!alreadyMember) {
      await CommunityGroup.findByIdAndUpdate(globalGroup._id, {
        $push: { members: { user: userId, role: 'member', joinedAt: new Date() } }
      });
      console.log(`[Community] Auto-joined user ${userId} into OXY Global Community.`);
    }
  } catch (error) {
    console.error('[Community] addUserToGlobalGroup error:', error);
  }
};

// Sync Global Group so everyone is a member
const ensureGlobalGroup = async (): Promise<any> => {
  let globalGroup = await CommunityGroup.findOne({ type: 'GlobalGroup' }) as any;
  
  // Find all active users
  const allUsers = await User.find({ status: { $ne: 'Terminated' } }, '_id') as any[];
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
    
    // Auto-sync eligible department groups for this user on load
    await syncUserDepartmentGroups(req.user);

    // Initial query matching explicit membership OR eligible department groups
    // Even if sync was slightly delayed, this query ensures they can see it instantly
    const userDepartment = req.user?.department;
    let baseQuery: any = {
      $or: [
        { 'members.user': userId }
      ]
    };
    
    if (userDepartment) {
      baseQuery.$or.push({ type: 'DepartmentGroup', department: userDepartment });
    }

    let finalQuery = baseQuery;

    // Multi-tenant containment
    if (req.user?.role !== 'ROOT_ADMIN') {
      const userHotel = req.user?.hotel;
      finalQuery = {
        $and: [
          baseQuery,
          {
            $or: [
              { hotel: userHotel },
              { type: 'GlobalGroup' },
              { hotel: null },
              { hotel: { $exists: false } },
              { 'members.user': userId }
            ]
          }
        ]
      };
    }

    const groups = await CommunityGroup.find(finalQuery)
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
    const { name, type, description, department, memberIds, selectionMode, selectionValues, autoSyncDept, groupIcon } = req.body;
    
    // RBAC: Root Admin, Hotel Admin, HR Manager, or Dept Manager can create groups
    const allowedRoles = ['ROOT_ADMIN', 'HOTEL_ADMIN', 'HR_MANAGER', 'DEPT_MANAGER'];
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      throw new ApiError(403, 'Access denied: Insufficient privileges to create groups');
    }

    let hotelId = req.user?.hotel;
    if (req.user.role === 'ROOT_ADMIN' && req.body.hotelId) {
      hotelId = req.body.hotelId;
    }

    let finalMemberIds = new Set<string>();

    // 1. Add explicitly passed memberIds
    if (Array.isArray(memberIds)) {
      memberIds.forEach((id: string) => finalMemberIds.add(id));
    }

    // 2. Department-based query
    if (selectionMode === 'department' && Array.isArray(selectionValues)) {
      const usersInDepts = await User.find({
              status: { $ne: 'Terminated' },
              department: { $in: selectionValues },
              ...(hotelId ? { hotel: hotelId } : {})
            }, '_id') as any[];
      usersInDepts.forEach((u) => finalMemberIds.add(u._id.toString()));
    }

    // 3. Manager-based query
    if (selectionMode === 'manager' && Array.isArray(selectionValues)) {
      const usersUnderManagers = await User.find({
              status: { $ne: 'Terminated' },
              reportingManager: { $in: selectionValues },
              ...(hotelId ? { hotel: hotelId } : {})
            }, '_id') as any[];
      usersUnderManagers.forEach((u) => finalMemberIds.add(u._id.toString()));
    }

    const membersList = Array.from(finalMemberIds).map((mId) => ({
      user: new mongoose.Types.ObjectId(mId),
      role: 'member' as 'admin' | 'moderator' | 'member',
      joinedAt: new Date()
    }));

    // Creator is Admin member
    const creatorId = req.user!._id.toString();
    const hasCreator = membersList.some(m => m.user.toString() === creatorId);
    if (!hasCreator) {
      membersList.push({
        user: req.user!._id,
        role: 'admin',
        joinedAt: new Date()
      });
    } else {
      const creatorIndex = membersList.findIndex(m => m.user.toString() === creatorId);
      membersList[creatorIndex].role = 'admin';
    }

    const group = await CommunityGroup.create({
      name,
      type,
      description,
      groupIcon,
      autoSyncDept: !!autoSyncDept,
      hotel: hotelId,
      department: type === 'DepartmentGroup' ? department : undefined,
      createdBy: req.user._id,
      members: membersList
    });

    const populatedGroup = await CommunityGroup.findById(group._id)
          .populate('createdBy', 'firstName lastName role')
          .populate('members.user', 'firstName lastName photoUrl role department status');

    const io = getIO();

    // Notify users
    for (const member of membersList) {
      if (member.user.toString() !== creatorId) {
        await createNotification({
          title: 'New Group Assignment',
          message: `You have been added to a new group: ${name}`,
          type: 'community',
          link: '/dashboard/community',
          recipientId: member.user.toString(),
          sender: req.user._id.toString(),
        }).catch(err => console.error('Failed to create group notification', err));

        if (io) {
          io.to(`user_${member.user.toString()}`).emit('user_added_to_group', populatedGroup);
        }
      }
    }

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
      data: { group: populatedGroup }
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

    const group = await CommunityGroup.findById(groupId);
    if (!group) throw new ApiError(404, 'Community group not found');

    const isMember = group.members.some((m: any) => m.user.toString() === req.user?._id.toString());
    const isPublic = ['GlobalGroup', 'PublicGroup', 'AnnouncementChannel'].includes(group.type);
    const isDeptMatch = group.type === 'DepartmentGroup' && group.department === req.user?.department;
    const isPrivilegedAdmin = ['ROOT_ADMIN', 'HOTEL_ADMIN', 'HR_MANAGER'].includes(req.user?.role || '');
    
    if (!isMember && !isPublic && !isDeptMatch && !isPrivilegedAdmin) {
      throw new ApiError(403, 'Access denied: You are not a member of this group');
    }

    const messages = await CommunityMessage.find({ group: groupId })
      .populate('sender', 'firstName lastName photoUrl role department')
      .populate('parentMessage')
      .populate('appreciation.recipient', 'firstName lastName photoUrl role department')
      .sort({ createdAt: -1 }) // Newest first for pagination
      .skip(skip)
      .limit(limit)
      ;

    messages.reverse(); // Reverse back to chronological order for UI

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

    const isMember = group.members.some((m: any) => m.user.toString() === req.user?._id.toString());
    const isPublic = ['GlobalGroup', 'PublicGroup'].includes(group.type);
    const isDeptMatch = group.type === 'DepartmentGroup' && group.department === req.user?.department;
    const isPrivilegedAdmin = ['ROOT_ADMIN', 'HOTEL_ADMIN', 'HR_MANAGER'].includes(req.user?.role || '');

    if (!isMember && !isPublic && !isDeptMatch && !isPrivilegedAdmin) {
      throw new ApiError(403, 'Access denied: You are not a member of this group');
    }

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

    // Handle @all mention logic
    let isAllMention = false;
    if (content && typeof content === 'string' && content.toLowerCase().includes('@all')) {
      const isGroupAdmin = group.members.some((m: any) => m.user.toString() === req.user?._id.toString() && m.role === 'admin');
      const allowedRoles = ['ROOT_ADMIN', 'HOTEL_ADMIN', 'HR_MANAGER', 'DEPT_MANAGER'];
      const hasPermission = isGroupAdmin || (req.user && allowedRoles.includes(req.user.role));

      if (hasPermission) {
        isAllMention = true;
      }
    }

    // Handle Mentions Scan & Notifications
    let mentionedUserIds = new Set<string>();
    if (isAllMention) {
      group.members.forEach((m: any) => {
        if (m.user.toString() !== req.user?._id.toString()) {
          mentionedUserIds.add(m.user.toString());
        }
      });
    } else if (Array.isArray(req.body.mentionedUserIds)) {
      req.body.mentionedUserIds.forEach((id: string) => mentionedUserIds.add(id));
    } else if (content && typeof content === 'string') {
      const users = await User.find({
              _id: { $in: group.members.map((m: any) => m.user) },
              status: { $ne: 'Terminated' }
            });
      for (const u of users) {
        const fullName = `${u.firstName} ${u.lastName}`.toLowerCase();
        if (content.toLowerCase().includes(`@${fullName}`) || content.toLowerCase().includes(`@${u.firstName.toLowerCase()}`)) {
          mentionedUserIds.add(u._id.toString());
        }
      }
    }

    const groupMembers = group.members.filter((m: any) => m.user.toString() !== req.user?._id.toString());
    const senderName = `${req.user?.firstName} ${req.user?.lastName}`;
    const messagePreview = content ? content.substring(0, 60) : 'Sent an attachment';

    for (const member of groupMembers) {
      const memberIdStr = member.user.toString();
      const isMentioned = mentionedUserIds.has(memberIdStr);
      
      const type = isMentioned ? 'mention' : 'chat';
      const title = isAllMention 
        ? `📢 @all in ${group.name}` 
        : (isMentioned ? '💬 Mentioned in Chat' : `💬 New Message in ${group.name}`);
      const messageText = isAllMention 
        ? `${senderName} mentioned @all in "${group.name}": "${content.substring(0, 50)}${content.length > 50 ? '...' : ''}"`
        : (isMentioned 
          ? `${senderName} mentioned you in "${group.name}": "${content.substring(0, 50)}${content.length > 50 ? '...' : ''}"`
          : `${senderName}: ${messagePreview}`);

      const notif = await Notification.create({
        recipient: member.user,
        sender: req.user?._id,
        title,
        message: messageText,
        type,
        link: `/dashboard/community?groupId=${groupId}`
      });
      const populatedNotif = await notif.populate('sender', 'firstName lastName photoUrl role');

      // Check online status via Socket.IO adapter
      const io = getIO();
      const userRoom = io?.sockets.adapter.rooms.get(`user_${memberIdStr}`);
      const isOnline = userRoom && userRoom.size > 0;

      await DeliveryStatus.create({
        message: message._id,
        user: member.user,
        status: isOnline ? 'delivered' : 'sent',
        deliveredAt: isOnline ? new Date() : undefined
      });

      if (isOnline) {
        if (io) {
          io.to(`user_${memberIdStr}`).emit('new_notification', populatedNotif);
        }
      } else {
        await sendPushNotification(memberIdStr, {
          title,
          body: messageText,
          data: {
            link: `/dashboard/community?groupId=${groupId}`
          }
        });
      }
    }

    // Realtime Socket Broadcast
    if ((global as any).io) {
      (global as any).io.to(`group_${groupId}`).emit('new_message', populatedMessage);
    }

    // Increment activity badge for all recipients
    const recipientIds = groupMembers.map((m: any) => m.user.toString());
    if (recipientIds.length > 0) {
      await incrementActivityForMany(recipientIds, 'Community', 1);
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

// POST /api/community/calls
export const startCallSession = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { groupId, callType } = req.body;
    const userId = req.user?._id;
    if (!userId) throw new ApiError(401, 'Unauthorized');

    const group = await CommunityGroup.findById(groupId);
    if (!group) throw new ApiError(404, 'Community group not found');

    // Access control: must be member of group
    const isMember = group.members.some((m: any) => m.user.toString() === userId.toString());
    const isPublic = ['GlobalGroup', 'PublicGroup'].includes(group.type);
    if (!isMember && !isPublic && req.user?.role !== 'ROOT_ADMIN') {
      throw new ApiError(403, 'Access denied: You are not a member of this group');
    }

    // End any existing ongoing call in this group by this caller to avoid duplicates
    await CallSession.updateMany(
      { group: groupId, caller: userId, status: 'ongoing' },
      { status: 'ended', endedAt: new Date() }
    );

    const callSession = await CallSession.create({
      group: groupId,
      caller: userId,
      callType,
      status: 'ongoing',
      participants: [userId]
    });

    const populatedCall = await CallSession.findById(callSession._id)
          .populate('caller', 'firstName lastName photoUrl')
          .populate('participants', 'firstName lastName photoUrl role department');

    // Create notifications for all other group members
    const otherMembers = group.members
      .map((m: any) => m.user.toString())
      .filter((mId: string) => mId !== userId.toString());

    const callerName = `${req.user!.firstName} ${req.user!.lastName}`;

    for (const mId of otherMembers) {
      const notif = await Notification.create({
        recipient: mId,
        sender: req.user?._id,
        title: callType === 'video' ? '📹 Incoming Video Call' : '📞 Incoming Voice Call',
        message: `${callerName} started a group ${callType} call in "${group.name}"`,
        type: 'call',
        actionRequired: true, // Calls require Accept/Decline action
        link: `/dashboard/community?groupId=${groupId}&callId=${callSession._id}`
      });
      const populatedNotif = await notif.populate('sender', 'firstName lastName photoUrl role');

      // Emit notification/call to user
      const io = getIO();
      const userRoom = io?.sockets.adapter.rooms.get(`user_${mId}`);
      const isOnline = userRoom && userRoom.size > 0;

      if (isOnline) {
        if (io) {
          io.to(`user_${mId}`).emit('new_notification', populatedNotif);
          io.to(`user_${mId}`).emit('incoming_call', {
            callId: callSession._id,
            groupId: group._id,
            groupName: group.name,
            callType,
            callerName
          });
        }
      } else {
        await sendPushNotification(mId, {
          title: callType === 'video' ? '📹 Incoming Video Call' : '📞 Incoming Voice Call',
          body: `${callerName} started a group ${callType} call in "${group.name}"`,
          data: {
            link: `/dashboard/community?groupId=${groupId}&callId=${callSession._id}`
          }
        });
      }
    }

    // Log call in AuditLog
    await AuditLog.create({
      user: userId,
      hotel: req.user!.hotel || group.hotel,
      action: `START_${callType.toUpperCase()}_CALL`,
      module: 'COMMUNITY',
      details: `Started a group ${callType} call in "${group.name}"`
    });

    res.status(201).json({
      status: 'success',
      data: {
        callSession: populatedCall,
        token: `rtc_token_mock_${Math.random().toString(36).substring(7)}`,
        appId: 'mock_app_id_value_for_future_ready_agora',
        uid: Math.floor(Math.random() * 100000)
      }
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/community/calls/:callId/join
export const joinCallSession = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { callId } = req.params;
    const userId = req.user?._id;
    if (!userId) throw new ApiError(401, 'Unauthorized');

    const callSession = await CallSession.findById(callId);
    if (!callSession) throw new ApiError(404, 'Call session not found');

    if (callSession.status === 'ended') {
      throw new ApiError(400, 'Call session has already ended');
    }

    // Verify membership
    const group = await CommunityGroup.findById(callSession.group);
    if (!group) throw new ApiError(404, 'Group not found');
    const isMember = group.members.some((m: any) => m.user.toString() === userId.toString());
    const isPublic = ['GlobalGroup', 'PublicGroup'].includes(group.type);
    if (!isMember && !isPublic && req.user?.role !== 'ROOT_ADMIN') {
      throw new ApiError(403, 'Access denied: You are not a member of this group');
    }

    // Add to participants if not already joined
    if (!callSession.participants.includes(userId)) {
      callSession.participants.push(userId);
      await callSession.save();
    }

    const populatedCall = await CallSession.findById(callId)
          .populate('caller', 'firstName lastName photoUrl')
          .populate('participants', 'firstName lastName photoUrl role department');

    // Notify other participants via Socket
    const io = getIO();
    if (io) {
      io.to(`group_${callSession.group.toString()}`).emit('call_updated', populatedCall);
    }

    res.status(200).json({
      status: 'success',
      data: { callSession: populatedCall }
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/community/calls/:callId/leave
export const leaveCallSession = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { callId } = req.params;
    const userId = req.user?._id;
    if (!userId) throw new ApiError(401, 'Unauthorized');

    const callSession = await CallSession.findById(callId);
    if (!callSession) throw new ApiError(404, 'Call session not found');

    // Remove from participants
    callSession.participants = callSession.participants.filter(
      (pId: any) => pId.toString() !== userId.toString()
    );

    // If no participants left, end call
    if (callSession.participants.length === 0) {
      callSession.status = 'ended';
      callSession.endedAt = new Date();

      const duration = Math.round((callSession.endedAt.getTime() - callSession.startedAt.getTime()) / 1000);
      const logPayload = {
        group: callSession.group,
        caller: callSession.caller,
        participants: [userId],
        startedAt: callSession.startedAt,
        endedAt: callSession.endedAt,
        duration
      };

      if (callSession.callType === 'video') {
        await VideoCallLog.create(logPayload);
      } else {
        await CallLog.create(logPayload);
      }
    }

    await callSession.save();

    const populatedCall = await CallSession.findById(callId)
          .populate('caller', 'firstName lastName photoUrl')
          .populate('participants', 'firstName lastName photoUrl role department');

    const io = getIO();
    if (io) {
      io.to(`group_${callSession.group.toString()}`).emit('call_updated', populatedCall);
      if (callSession.status === 'ended') {
        io.to(`group_${callSession.group.toString()}`).emit('call_ended', callId);
      }
    }

    res.status(200).json({
      status: 'success',
      data: { callSession: populatedCall }
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/community/calls/active
export const getActiveCalls = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?._id;
    if (!userId) throw new ApiError(401, 'Unauthorized');

    // Find all groups user belongs to (or are global/public)
    const userGroups = await CommunityGroup.find({
          $or: [
            { type: 'GlobalGroup' },
            { type: 'PublicGroup' },
            { 'members.user': userId }
          ]
        }, '_id');

    const groupIds = userGroups.map(g => g._id);

    const activeCalls = await CallSession.find({
          group: { $in: groupIds },
          status: 'ongoing'
        })
          .populate('caller', 'firstName lastName photoUrl')
          .populate('participants', 'firstName lastName photoUrl role department')
          .populate('group', 'name type');

    res.status(200).json({
      status: 'success',
      data: { activeCalls }
    });
  } catch (error) {
    next(error);
  }
};

// Helper: Auto-sync user to department groups
export const syncUserDepartmentGroups = async (user: any): Promise<void> => {
  try {
    if (!user.department || user.status === 'Terminated') return;

    // Find all department groups matching this department
    const query: any = {
      type: 'DepartmentGroup',
      department: user.department,
    };
    
    if (user.hotel && user.role !== 'ROOT_ADMIN') {
      query.hotel = user.hotel;
    }

    const groups = await CommunityGroup.find(query);

    for (const group of groups) {
      const isMember = group.members.some((m: any) => m.user.toString() === user._id.toString());
      if (!isMember) {
        group.members.push({
          user: user._id,
          role: 'member',
          joinedAt: new Date()
        });
        await group.save();
        console.log(`[Community] Auto-added user ${user.firstName} ${user.lastName} to group ${group.name}`);
        
        // Emit socket event so client updates UI
        const io = getIO();
        if (io) {
          const populatedGroup = await CommunityGroup.findById(group._id)
                      .populate('createdBy', 'firstName lastName role')
                      .populate('members.user', 'firstName lastName photoUrl role department status');
          io.to(`user_${user._id.toString()}`).emit('user_added_to_group', populatedGroup);
        }
      }
    }
  } catch (error) {
    console.error('Error in syncUserDepartmentGroups:', error);
  }
};

// POST /api/community/push-tokens
export const savePushToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?._id;
    if (!userId) throw new ApiError(401, 'Unauthorized');

    const { token, deviceType } = req.body;
    if (!token) throw new ApiError(400, 'Push token is required');

    await PushToken.findOneAndUpdate(
      { token },
      { user: userId, deviceType, updatedAt: new Date() },
      { upsert: true, new: true }
    );

    res.status(200).json({
      status: 'success',
      message: 'Push token saved successfully'
    });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/community/push-tokens
export const deletePushToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { token } = req.body;
    if (!token) throw new ApiError(400, 'Push token is required');

    await PushToken.deleteOne({ token });

    res.status(200).json({
      status: 'success',
      message: 'Push token deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/community/groups/:id
export const getGroupById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id: groupId } = req.params;
    const group = await CommunityGroup.findById(groupId)
          .populate('createdBy', 'firstName lastName photoUrl role department')
          .populate('members.user', 'firstName lastName photoUrl role department designation status employeeId reportingManager');

    if (!group) throw new ApiError(404, 'Community group not found');

    const isMember = group.members.some((m: any) => m.user && m.user._id.toString() === req.user?._id.toString());
    const isPublic = ['GlobalGroup', 'PublicGroup'].includes(group.type);
    if (!isMember && !isPublic && req.user?.role !== 'ROOT_ADMIN') {
      throw new ApiError(403, 'Access denied: You are not a member of this group');
    }

    res.status(200).json({
      status: 'success',
      data: { group }
    });
  } catch (error) {
    next(error);
  }
};

// PUT /api/community/groups/:id
export const updateGroup = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id: groupId } = req.params;
    const { name, description, groupIcon } = req.body;

    const group = await CommunityGroup.findById(groupId);
    if (!group) throw new ApiError(404, 'Community group not found');

    const isCreator = group.createdBy?.toString() === req.user?._id.toString();
    const isGroupAdmin = group.members.some(
      (m: any) => m.user.toString() === req.user?._id.toString() && m.role === 'admin'
    );
    const isRoot = req.user?.role === 'ROOT_ADMIN';

    if (!isCreator && !isGroupAdmin && !isRoot) {
      throw new ApiError(403, 'Access denied: Only group admins can update group settings');
    }

    if (name) group.name = name;
    if (description !== undefined) group.description = description;
    if (groupIcon !== undefined) group.groupIcon = groupIcon;

    await group.save();

    const populatedGroup = await CommunityGroup.findById(groupId)
          .populate('createdBy', 'firstName lastName role')
          .populate('members.user', 'firstName lastName photoUrl role department status');

    if ((global as any).io) {
      (global as any).io.to(`group_${groupId}`).emit('group_updated', populatedGroup);
    }

    res.status(200).json({
      status: 'success',
      data: { group: populatedGroup }
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/community/groups/:id/members
export const addGroupMember = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id: groupId } = req.params;
    const { userId } = req.body;

    if (!userId) throw new ApiError(400, 'User ID is required');

    const group = await CommunityGroup.findById(groupId);
    if (!group) throw new ApiError(404, 'Community group not found');

    const isCreator = group.createdBy?.toString() === req.user?._id.toString();
    const isGroupAdmin = group.members.some(
      (m: any) => m.user.toString() === req.user?._id.toString() && m.role === 'admin'
    );
    const isRoot = req.user?.role === 'ROOT_ADMIN';

    if (!isCreator && !isGroupAdmin && !isRoot) {
      throw new ApiError(403, 'Access denied: Only group admins can add members');
    }

    const targetUser = await User.findById(userId);
    if (!targetUser) throw new ApiError(404, 'User not found');

    const alreadyMember = group.members.some((m: any) => m.user.toString() === userId.toString());
    if (alreadyMember) {
      throw new ApiError(400, 'User is already a member of this group');
    }

    group.members.push({
      user: userId,
      role: 'member',
      joinedAt: new Date()
    });

    await group.save();

    const populatedGroup = await CommunityGroup.findById(groupId)
          .populate('createdBy', 'firstName lastName role')
          .populate('members.user', 'firstName lastName photoUrl role department status');

    if ((global as any).io) {
      (global as any).io.to(`group_${groupId}`).emit('group_updated', populatedGroup);
      (global as any).io.to(`user_${userId}`).emit('user_added_to_group', populatedGroup);
    }

    await createNotification({
      title: 'New Group Assignment',
      message: `You have been added to a new group: ${group.name}`,
      type: 'community',
      link: '/dashboard/community',
      recipientId: userId,
      sender: req.user?._id?.toString(),
    }).catch(err => console.error('Failed to create group notification', err));

    res.status(200).json({
      status: 'success',
      data: { group: populatedGroup }
    });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/community/groups/:id/members/:userId
export const removeGroupMember = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id: groupId, userId } = req.params;

    const group = await CommunityGroup.findById(groupId);
    if (!group) throw new ApiError(404, 'Community group not found');

    const isCreator = group.createdBy?.toString() === req.user?._id.toString();
    const isGroupAdmin = group.members.some(
      (m: any) => m.user.toString() === req.user?._id.toString() && m.role === 'admin'
    );
    const isRoot = req.user?.role === 'ROOT_ADMIN';

    if (!isCreator && !isGroupAdmin && !isRoot) {
      throw new ApiError(403, 'Access denied: Only group admins can remove members');
    }

    if (group.createdBy?.toString() === userId && !isRoot && req.user?._id.toString() !== userId) {
      throw new ApiError(400, 'Cannot remove the group owner/creator');
    }

    const isMember = group.members.some((m: any) => m.user.toString() === userId.toString());
    if (!isMember) {
      throw new ApiError(400, 'User is not a member of this group');
    }

    group.members = group.members.filter((m: any) => m.user.toString() !== userId.toString());

    await group.save();

    const populatedGroup = await CommunityGroup.findById(groupId)
          .populate('createdBy', 'firstName lastName role')
          .populate('members.user', 'firstName lastName photoUrl role department status');

    if ((global as any).io) {
      (global as any).io.to(`group_${groupId}`).emit('group_updated', populatedGroup);
      (global as any).io.to(`user_${userId}`).emit('group_removed', { groupId });
    }

    res.status(200).json({
      status: 'success',
      data: { group: populatedGroup }
    });
  } catch (error) {
    next(error);
  }
};

// PUT /api/community/groups/:id/members/:userId/role
export const updateGroupMemberRole = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id: groupId, userId } = req.params;
    const { role } = req.body;

    if (!['admin', 'member'].includes(role)) {
      throw new ApiError(400, "Role must be 'admin' or 'member'");
    }

    const group = await CommunityGroup.findById(groupId);
    if (!group) throw new ApiError(404, 'Community group not found');

    const isCreator = group.createdBy?.toString() === req.user?._id.toString();
    const isGroupAdmin = group.members.some(
      (m: any) => m.user.toString() === req.user?._id.toString() && m.role === 'admin'
    );
    const isRoot = req.user?.role === 'ROOT_ADMIN';

    if (!isCreator && !isGroupAdmin && !isRoot) {
      throw new ApiError(403, 'Access denied: Only group admins can manage member roles');
    }

    if (group.createdBy?.toString() === userId && role === 'member') {
      throw new ApiError(400, 'Cannot demote the group owner/creator');
    }

    const memberIndex = group.members.findIndex((m: any) => m.user.toString() === userId.toString());
    if (memberIndex === -1) {
      throw new ApiError(400, 'User is not a member of this group');
    }

    group.members[memberIndex].role = role;
    await group.save();

    const populatedGroup = await CommunityGroup.findById(groupId)
          .populate('createdBy', 'firstName lastName role')
          .populate('members.user', 'firstName lastName photoUrl role department status');

    if ((global as any).io) {
      (global as any).io.to(`group_${groupId}`).emit('group_updated', populatedGroup);
    }

    res.status(200).json({
      status: 'success',
      data: { group: populatedGroup }
    });
  } catch (error) {
    next(error);
  }
};
