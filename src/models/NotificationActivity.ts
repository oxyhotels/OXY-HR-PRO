import mongoose, { Schema, Document, Types } from 'mongoose';

export interface INotificationActivity extends Document {
  userId: Types.ObjectId;
  module: string;
  count: number;
  lastSeen: Date;
}

const NotificationActivitySchema = new Schema<INotificationActivity>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    module: { type: String, required: true },
    count: { type: Number, default: 0 },
    lastSeen: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
  }
);

// Compound index for ultra-fast queries per user/module
NotificationActivitySchema.index({ userId: 1, module: 1 }, { unique: true });

export const NotificationActivity = mongoose.models.NotificationActivity || mongoose.model<INotificationActivity>('NotificationActivity', NotificationActivitySchema);
