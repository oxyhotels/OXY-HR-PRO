import { Schema, model, models, Document } from 'mongoose';

export interface ICallLog extends Document {
  group: Schema.Types.ObjectId;
  caller: Schema.Types.ObjectId;
  participants: Schema.Types.ObjectId[];
  startedAt: Date;
  endedAt?: Date;
  duration?: number; // in seconds
  createdAt: Date;
  updatedAt: Date;
}

const CallLogSchema = new Schema<ICallLog>(
  {
    group: { type: Schema.Types.ObjectId, ref: 'CommunityGroup', required: true },
    caller: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    participants: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    startedAt: { type: Date, required: true },
    endedAt: { type: Date },
    duration: { type: Number }
  },
  { timestamps: true }
);

CallLogSchema.index({ group: 1 });
CallLogSchema.index({ caller: 1 });

export const CallLog = models.CallLog || model<ICallLog>('CallLog', CallLogSchema);
