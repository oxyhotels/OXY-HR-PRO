import { Notification } from '@/models/Notification';
import { User } from '@/models/User';

export interface CreateNotificationPayload {
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'alert' | 'ticket' | 'compliance' | 'performance' | 'chat' | 'call' | 'mention' | 'approval' | 'task' | 'system' | 'community';
  link?: string;
  recipientRole?: 'ROOT_ADMIN';
  recipientId?: string;
  sender?: string;
  actionRequired?: boolean;
}

export const createNotification = async (payload: CreateNotificationPayload) => {
  try {
    let recipients: string[] = [];

    if (payload.recipientId) {
      recipients.push(payload.recipientId);
    } else if (payload.recipientRole === 'ROOT_ADMIN') {
      const roots = await User.find({ role: 'ROOT_ADMIN' }).select('_id');
      recipients = roots.map(r => r._id.toString());
    }

    if (recipients.length === 0) return [];

    const notifications = await Promise.all(
      recipients.map(async (recipientId) => {
        const notif = await Notification.create({
          recipient: recipientId,
          sender: payload.sender,
          title: payload.title,
          message: payload.message,
          type: payload.type,
          link: payload.link,
          actionRequired: payload.actionRequired,
          read: false
        });

        const populatedNotif = payload.sender 
          ? await notif.populate('sender', 'firstName lastName photoUrl role') 
          : notif;

        // Emit Socket event to this recipient's user room
        const io = (global as any).io;
        if (io) {
          console.log(`[Notification Service] Emitting new_notification to user_${recipientId}`);
          io.to(`user_${recipientId}`).emit('new_notification', populatedNotif);
        }

        return populatedNotif;
      })
    );

    return notifications;
  } catch (error) {
    console.error('Error creating notification:', error);
    return [];
  }
};
