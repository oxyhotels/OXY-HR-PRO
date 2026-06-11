import { Schema, model, models, Document } from 'mongoose';

export type TaskPriority = 'Low' | 'Medium' | 'High';
export type TaskStatus = 'Todo' | 'In_Progress' | 'In_Review' | 'Completed';

export interface ITask extends Document {
  title: string;
  description: string;
  hotel: Schema.Types.ObjectId;
  assignedTo?: Schema.Types.ObjectId;
  assignedBy: Schema.Types.ObjectId;
  department?: string;
  priority: TaskPriority;
  status: TaskStatus;
  progress: number; // Percentage: 0 to 100
  dueDate: Date;
  checklist: { text: string; done: boolean }[];
  evidenceUrl?: string;
  evidenceType?: 'photo' | 'video';
  evidenceLocation?: { lat: number; lng: number };
  isRecurring: boolean;
  recurringInterval: 'Daily' | 'Weekly' | 'None';
  // Advanced Ops Center fields
  slaDuration?: number; // In minutes
  slaStart?: Date;
  slaBreached?: boolean;
  healthScore?: number;
  reworkCount?: number;
  escalationLevel?: number;
  rca?: {
    reason: string;
    category: string;
    loggedAt: Date;
  };
  businessImpact?: {
    guestSatisfaction: number;
    revenueImpact: number;
    complianceImpact: number;
  };
  geoVerified?: {
    verified: boolean;
    lat: number;
    lng: number;
    selfieUrl: string;
    isSuspicious: boolean;
    fraudFlags: string[];
  };
  isDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const TaskSchema = new Schema<ITask>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    hotel: { type: Schema.Types.ObjectId, ref: 'Hotel', required: true },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User', required: false },
    assignedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    department: { type: String, trim: true },
    priority: {
      type: String,
      enum: ['Low', 'Medium', 'High'],
      default: 'Medium',
    },
    status: {
      type: String,
      enum: ['Todo', 'In_Progress', 'In_Review', 'Completed'],
      default: 'Todo',
    },
    progress: { type: Number, min: 0, max: 100, default: 0 },
    dueDate: { type: Date, required: true },
    checklist: [
      {
        text: { type: String, required: true },
        done: { type: Boolean, default: false },
      },
    ],
    evidenceUrl: { type: String },
    evidenceType: { type: String, enum: ['photo', 'video'] },
    evidenceLocation: {
      lat: { type: Number },
      lng: { type: Number },
    },
    isRecurring: { type: Boolean, default: false },
    recurringInterval: {
      type: String,
      enum: ['Daily', 'Weekly', 'None'],
      default: 'None',
    },
    // Advanced Operations Execution Fields
    slaDuration: { type: Number, default: 30 },
    slaStart: { type: Date },
    slaBreached: { type: Boolean, default: false },
    healthScore: { type: Number, default: 100 },
    reworkCount: { type: Number, default: 0 },
    escalationLevel: { type: Number, default: 0 },
    rca: {
      reason: { type: String },
      category: { type: String },
      loggedAt: { type: Date },
    },
    businessImpact: {
      guestSatisfaction: { type: Number, default: 5 },
      revenueImpact: { type: Number, default: 0 },
      complianceImpact: { type: Number, default: 0 },
    },
    geoVerified: {
      verified: { type: Boolean, default: false },
      lat: { type: Number },
      lng: { type: Number },
      selfieUrl: { type: String },
      isSuspicious: { type: Boolean, default: false },
      fraudFlags: [{ type: String }],
    },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date },
  },
  { timestamps: true }
);

TaskSchema.index({ hotel: 1, assignedTo: 1 });
TaskSchema.index({ hotel: 1, status: 1 });

export const Task = models.Task || model<ITask>('Task', TaskSchema);
