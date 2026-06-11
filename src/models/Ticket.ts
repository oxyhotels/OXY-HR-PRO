import { Schema, model, models, Document } from 'mongoose';

export interface ITicketTimeline {
  status: 'Open' | 'InProgress' | 'Resolved';
  notes?: string;
  time: Date;
}

export interface ITicket extends Document {
  employee: Schema.Types.ObjectId;
  hotel: Schema.Types.ObjectId;
  category: 'HR' | 'IT' | 'Maintenance' | 'Complaint';
  title: string;
  description: string;
  priority: 'Low' | 'Medium' | 'High';
  status: 'Open' | 'InProgress' | 'Resolved';
  assignedTo?: Schema.Types.ObjectId;
  slaDueDate: Date;
  timeline: ITicketTimeline[];
  createdAt: Date;
  updatedAt: Date;
}

const TicketSchema = new Schema<ITicket>(
  {
    employee: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    hotel: { type: Schema.Types.ObjectId, ref: 'Hotel', required: true },
    category: {
      type: String,
      enum: ['HR', 'IT', 'Maintenance', 'Complaint'],
      required: true,
    },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    priority: {
      type: String,
      enum: ['Low', 'Medium', 'High'],
      default: 'Medium',
    },
    status: {
      type: String,
      enum: ['Open', 'InProgress', 'Resolved'],
      default: 'Open',
    },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User' },
    slaDueDate: { type: Date, required: true },
    timeline: [
      {
        status: { type: String, enum: ['Open', 'InProgress', 'Resolved'], required: true },
        notes: { type: String },
        time: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

TicketSchema.index({ hotel: 1, category: 1 });
TicketSchema.index({ hotel: 1, status: 1 });

export const Ticket = models.Ticket || model<ITicket>('Ticket', TicketSchema);
