import { NotificationActivity } from '@/models/NotificationActivity';
import { getIO } from '@/lib/socket';
import { Types } from 'mongoose';

export const incrementActivity = async (userId: string | Types.ObjectId, module: string, amount: number = 1) => {
  try {
    const activity = await NotificationActivity.findOneAndUpdate(
      { userId: new Types.ObjectId(userId.toString()), module },
      { 
        $inc: { count: amount },
        $set: { updatedAt: new Date() }
      },
      { new: true, upsert: true }
    );

    const io = getIO();
    if (io) {
      io.to(`USER_${userId.toString()}`).emit('ACTIVITY_BADGE_UPDATE', {
        module,
        count: activity.count
      });
    }
  } catch (error) {
    console.error(`Failed to increment activity for ${module}:`, error);
  }
};

export const incrementActivityForMany = async (userIds: (string | Types.ObjectId)[], module: string, amount: number = 1) => {
  try {
    const bulkOps = userIds.map((userId) => ({
      updateOne: {
        filter: { userId: new Types.ObjectId(userId.toString()), module },
        update: { 
          $inc: { count: amount },
          $set: { updatedAt: new Date() }
        },
        upsert: true
      }
    }));

    if (bulkOps.length > 0) {
      await NotificationActivity.bulkWrite(bulkOps);
      
      const io = getIO();
      if (io) {
        // Fetch new counts to emit correctly, or just emit a generic "fetch" event
        // It's more accurate to fetch the updated docs, but for performance we can just emit an increment event
        userIds.forEach((userId) => {
          io.to(`USER_${userId.toString()}`).emit('ACTIVITY_BADGE_INCREMENT', { module, amount });
        });
      }
    }
  } catch (error) {
    console.error(`Failed to bulk increment activity for ${module}:`, error);
  }
};

export const resetActivity = async (userId: string | Types.ObjectId, module: string) => {
  try {
    await NotificationActivity.findOneAndUpdate(
      { userId: new Types.ObjectId(userId.toString()), module },
      { 
        $set: { count: 0, lastSeen: new Date(), updatedAt: new Date() }
      },
      { upsert: true }
    );

    const io = getIO();
    if (io) {
      io.to(`USER_${userId.toString()}`).emit('ACTIVITY_BADGE_UPDATE', {
        module,
        count: 0
      });
    }
  } catch (error) {
    console.error(`Failed to reset activity for ${module}:`, error);
  }
};
