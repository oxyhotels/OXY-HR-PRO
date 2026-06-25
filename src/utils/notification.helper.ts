import { Notification } from '../models/Notification';

interface NotificationPayload {
  recipient: string | any;
  sender?: string | any;
  title: string;
  message: string;
  type?: 'info' | 'success' | 'warning' | 'alert' | 'ticket' | 'compliance' | 'performance' | 'chat' | 'call' | 'mention' | 'approval' | 'task' | 'system';
  link?: string;
  actionRequired?: boolean;
}

export const sendRealTimeNotification = async (payload: NotificationPayload) => {
  try {
    // 1. Create DB record
    const notif = await Notification.create({
      ...payload,
      read: false
    });

    // 2. Populate sender if exists for UI display
    const populatedNotif = payload.sender 
      ? await notif.populate('sender', 'firstName lastName photoUrl role')
      : notif;

    // 3. Emit via socket
    const io = (global as any).io;
    if (io) {
      const recipientId = payload.recipient.toString();
      io.to(`user_${recipientId}`).emit('new_notification', populatedNotif);
    }

    return populatedNotif;
  } catch (err) {
    console.error('Failed to send real-time notification:', err);
    return null;
  }
};
