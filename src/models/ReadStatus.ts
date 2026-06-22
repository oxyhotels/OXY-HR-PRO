import { Schema, model, models, Document } from 'mongoose';

export interface IReadStatus extends Document {
  message: Schema.Types.ObjectId;
  user: Schema.Types.ObjectId;
  readAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ReadStatusSchema = new Schema<IReadStatus>(
  {
    message: { type: Schema.Types.ObjectId, ref: 'CommunityMessage', required: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    readAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

ReadStatusSchema.index({ message: 1, user: 1 }, { unique: true });
ReadStatusSchema.index({ user: 1 });

export const ReadStatus = models.ReadStatus || model<IReadStatus>('ReadStatus', ReadStatusSchema);
