import { Schema, model, models, Document } from 'mongoose';

export interface INotification extends Document {
  recipient: Schema.Types.ObjectId;
  sender?: Schema.Types.ObjectId;
  title: string;
  message: string;
  read: boolean;
  type: 'info' | 'success' | 'warning' | 'alert' | 'ticket' | 'compliance' | 'performance' | 'chat' | 'call' | 'mention' | 'approval' | 'task' | 'system' | 'community';
  link?: string;
  actionRequired?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    recipient: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    sender: { type: Schema.Types.ObjectId, ref: 'User' },
    title: { type: String, required: true },
    message: { type: String, required: true },
    read: { type: Boolean, default: false },
    type: {
      type: String,
      enum: ['info', 'success', 'warning', 'alert', 'ticket', 'compliance', 'performance', 'chat', 'call', 'mention', 'approval', 'task', 'system', 'community'],
      default: 'info',
    },
    link: { type: String },
    actionRequired: { type: Boolean, default: false },
  },
  { timestamps: true }
);

NotificationSchema.index({ recipient: 1, read: 1 });

export const Notification = models.Notification || model<INotification>('Notification', NotificationSchema);
