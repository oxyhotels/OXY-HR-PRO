import { Schema, model, models, Document } from 'mongoose';

export interface IDeliveryStatus extends Document {
  message: Schema.Types.ObjectId;
  user: Schema.Types.ObjectId;
  status: 'sent' | 'delivered' | 'failed';
  deliveredAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const DeliveryStatusSchema = new Schema<IDeliveryStatus>(
  {
    message: { type: Schema.Types.ObjectId, ref: 'CommunityMessage', required: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: ['sent', 'delivered', 'failed'], default: 'sent' },
    deliveredAt: { type: Date }
  },
  { timestamps: true }
);

DeliveryStatusSchema.index({ message: 1, user: 1 }, { unique: true });
DeliveryStatusSchema.index({ user: 1 });

export const DeliveryStatus = models.DeliveryStatus || model<IDeliveryStatus>('DeliveryStatus', DeliveryStatusSchema);
