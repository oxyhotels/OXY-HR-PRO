import { Schema, model, models, Document } from 'mongoose';

export interface IVideoCallLog extends Document {
  group: Schema.Types.ObjectId;
  caller: Schema.Types.ObjectId;
  participants: Schema.Types.ObjectId[];
  startedAt: Date;
  endedAt?: Date;
  duration?: number; // in seconds
  createdAt: Date;
  updatedAt: Date;
}

const VideoCallLogSchema = new Schema<IVideoCallLog>(
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

VideoCallLogSchema.index({ group: 1 });
VideoCallLogSchema.index({ caller: 1 });

export const VideoCallLog = models.VideoCallLog || model<IVideoCallLog>('VideoCallLog', VideoCallLogSchema);
