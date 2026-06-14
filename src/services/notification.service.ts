import { Notification } from '@/models/Notification';
import { User } from '@/models/User';

export interface CreateNotificationPayload {
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'alert' | 'ticket' | 'compliance' | 'performance';
  link?: string;
  recipientRole?: 'ROOT_ADMIN';
  recipientId?: string;
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
          title: payload.title,
          message: payload.message,
          type: payload.type,
          link: payload.link,
          read: false
        });

        // Emit Socket event to this recipient's user room
        const io = (global as any).io;
        if (io) {
          console.log(`[Notification Service] Emitting new_notification to user_${recipientId}`);
          io.to(`user_${recipientId}`).emit('new_notification', notif);
        }

        return notif;
      })
    );

    return notifications;
  } catch (error) {
    console.error('Error creating notification:', error);
    return [];
  }
};
