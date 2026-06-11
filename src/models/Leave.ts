import { Schema, model, models, Document } from 'mongoose';

export type LeaveType = 'Casual' | 'Sick' | 'Annual' | 'Unpaid';
export type LeaveStatus = 'Pending' | 'Approved' | 'Rejected';

export interface ILeave extends Document {
  employee: Schema.Types.ObjectId;
  hotel: Schema.Types.ObjectId;
  leaveType: LeaveType;
  startDate: Date;
  endDate: Date;
  reason: string;
  status: LeaveStatus;
  approvedBy?: Schema.Types.ObjectId;
  comments?: string;
  createdAt: Date;
  updatedAt: Date;
}

const LeaveSchema = new Schema<ILeave>(
  {
    employee: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    hotel: { type: Schema.Types.ObjectId, ref: 'Hotel', required: true },
    leaveType: {
      type: String,
      enum: ['Casual', 'Sick', 'Annual', 'Unpaid'],
      required: true,
    },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    reason: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ['Pending', 'Approved', 'Rejected'],
      default: 'Pending',
    },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    comments: { type: String, trim: true },
  },
  { timestamps: true }
);

LeaveSchema.index({ hotel: 1, status: 1 });
LeaveSchema.index({ employee: 1 });

export const Leave = models.Leave || model<ILeave>('Leave', LeaveSchema);
