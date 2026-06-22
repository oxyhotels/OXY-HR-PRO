import { Schema, model, models, Document } from 'mongoose';

export interface IPushToken extends Document {
  user: Schema.Types.ObjectId;
  token: string;
  deviceType?: string;
  browser?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PushTokenSchema = new Schema<IPushToken>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    token: { type: String, required: true, unique: true },
    deviceType: { type: String, default: 'web' },
    browser: { type: String }
  },
  { timestamps: true }
);

PushTokenSchema.index({ user: 1 });

export const PushToken = models.PushToken || model<IPushToken>('PushToken', PushTokenSchema);
