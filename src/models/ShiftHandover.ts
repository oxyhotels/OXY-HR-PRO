import { Schema, model, models, Document } from 'mongoose';

export interface IShiftHandover extends Document {
  hotel: Schema.Types.ObjectId;
  outgoingStaff: Schema.Types.ObjectId;
  incomingStaff: Schema.Types.ObjectId;
  tasks: Schema.Types.ObjectId[];
  status: 'Pending' | 'Accepted';
  notes?: string;
  createdAt: Date;
  acceptedAt?: Date;
}

const ShiftHandoverSchema = new Schema<IShiftHandover>(
  {
    hotel: { type: Schema.Types.ObjectId, ref: 'Hotel', required: true },
    outgoingStaff: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    incomingStaff: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    tasks: [{ type: Schema.Types.ObjectId, ref: 'Task' }],
    status: {
      type: String,
      enum: ['Pending', 'Accepted'],
      default: 'Pending',
    },
    notes: { type: String, trim: true },
    acceptedAt: { type: Date },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

ShiftHandoverSchema.index({ hotel: 1, incomingStaff: 1, status: 1 });

export const ShiftHandover = models.ShiftHandover || model<IShiftHandover>('ShiftHandover', ShiftHandoverSchema);
