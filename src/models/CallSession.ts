import { Schema, model, models, Document } from 'mongoose';

export interface ICallSession extends Document {
  group: Schema.Types.ObjectId;
  caller: Schema.Types.ObjectId;
  callType: 'voice' | 'video';
  status: 'ongoing' | 'ended';
  participants: Schema.Types.ObjectId[];
  startedAt: Date;
  endedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const CallSessionSchema = new Schema<ICallSession>(
  {
    group: { type: Schema.Types.ObjectId, ref: 'CommunityGroup', required: true },
    caller: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    callType: { type: String, enum: ['voice', 'video'], required: true },
    status: { type: String, enum: ['ongoing', 'ended'], default: 'ongoing' },
    participants: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    startedAt: { type: Date, default: Date.now },
    endedAt: { type: Date }
  },
  { timestamps: true }
);

export const CallSession = models.CallSession || model<ICallSession>('CallSession', CallSessionSchema);
