import { Schema, model, models, Document } from 'mongoose';


export type TaskPriority = 'Low' | 'Medium' | 'High' | 'Urgent';
export type TaskStatus = 'Pending' | 'To_Do' | 'Accepted' | 'In_Progress' | 'Completed' | 'On_Hold' | 'Rejected'; // ✅ Added To_Do
export type AssignmentType = 'all_departments' | 'individual' | 'department_wise' | 'name_wise' | 'designation_wise';
export type EvidenceRequirement = 'optional' | 'mandatory';

// ✅ NEW: Task History Interface
export interface ITaskHistory {
  action: string;
  remark?: string;
  userId: Schema.Types.ObjectId;
  userName: string;
  timestamp: Date;
}

export interface ITask extends Document {
  title: string;
  description: string;
  hotel: Schema.Types.ObjectId;
  assignedTo?: Schema.Types.ObjectId | Schema.Types.ObjectId[];
  assignedBy: Schema.Types.ObjectId;
  department?: string;
  assignedDepartments?: string[];
  assignmentType: AssignmentType;
  priority: TaskPriority;
  status: TaskStatus;
  progress: number;
  dueDate: Date;
  dueTime?: string;
  evidenceRequirement: EvidenceRequirement;
  checklist: { text: string; done: boolean }[];
  evidenceUrl?: string;
  evidenceType?: 'photo' | 'video';
  evidenceLocation?: { lat: number; lng: number };
  isRecurring: boolean;
  recurringInterval: 'Daily' | 'Weekly' | 'None';
  slaDuration?: number;
  slaStart?: Date;
  slaBreached?: boolean;
  healthScore?: number;
  reworkCount?: number;
  escalationLevel?: number;
  rca?: { reason: string; category: string; loggedAt: Date; };
  businessImpact?: { guestSatisfaction: number; revenueImpact: number; complianceImpact: number; };
  geoVerified?: { verified: boolean; lat: number; lng: number; selfieUrl: string; isSuspicious: boolean; fraudFlags: string[]; };
  responses: { userId: Schema.Types.ObjectId; action: 'accepted' | 'held' | 'rejected' | 'completed'; reason?: string; timestamp: Date; evidenceUrl?: string; evidenceType?: 'photo' | 'video'; }[];
  
  // ✅ NEW: Kanban & Timeline Fields
  latestRemark?: string;
  holdReason?: string;
  completionRemark?: string;
  taskHistory: ITaskHistory[];

  // ✅ NEW: Task Updates Array for Lifecycle Tracking
  taskUpdates: {
    status: string;
    description?: string;
    reason?: string;
    photoUrl?: string;
    updatedBy: Schema.Types.ObjectId;
    updatedByName: string;
    department: string;
    designation: string;
    createdAt: Date;
  }[];

  // ✅ NEW: Work Session Tracking
  taskWorkSessions: {
    startedAt: Date;
    endedAt?: Date;
    duration?: number; // in minutes
    updateMessage?: string;
    evidenceImage?: string;
    updatedBy: Schema.Types.ObjectId;
    updatedAt: Date;
  }[];
  totalWorkedMinutes: number;
  latestUpdate?: string;

  viewCount: number;
  acceptedAt?: Date;
  completedAt?: Date;
  isDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

function normalizeStatus(status: any): string {
  if (!status) return 'Pending';
  const normalized = status.toString().trim();
  const statusMap: Record<string, string> = {
    'Todo': 'To_Do', 'todo': 'To_Do', 'To_Do': 'To_Do',
    'Pending': 'Pending', 'pending': 'Pending',
    'Accepted': 'To_Do', 'accepted': 'To_Do', // Map old Accepted to new To_Do automatically
    'In_Progress': 'In_Progress', 'in_progress': 'In_Progress', 'inprogress': 'In_Progress', 'InProgress': 'In_Progress',
    'Completed': 'Completed', 'completed': 'Completed',
    'On_Hold': 'On_Hold', 'on_hold': 'On_Hold', 'onhold': 'On_Hold', 'OnHold': 'On_Hold',
    'Rejected': 'Rejected', 'rejected': 'Rejected',
  };
  return statusMap[normalized] || 'Pending';
}

const TaskSchema = new Schema<ITask>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    hotel: { type: Schema.Types.ObjectId, ref: 'Hotel', required: true },
    assignedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    department: { type: String, trim: true },
    assignedTo: { type: [Schema.Types.ObjectId], ref: 'User', required: false },
    assignedDepartments: [{ type: String, trim: true }],
    assignmentType: { type: String, enum: ['all_departments', 'individual', 'department_wise', 'name_wise', 'designation_wise'], default: 'individual' },
    priority: { type: String, enum: ['Low', 'Medium', 'High', 'Urgent'], default: 'Medium' },
    status: { type: String, enum: ['Pending', 'To_Do', 'Accepted', 'In_Progress', 'Completed', 'On_Hold', 'Rejected'], default: 'Pending' },
    progress: { type: Number, min: 0, max: 100, default: 0 },
    dueDate: { type: Date, required: true },
    dueTime: { type: String },
    evidenceRequirement: { type: String, enum: ['optional', 'mandatory'], default: 'optional' },
    checklist: [{ text: { type: String, required: true }, done: { type: Boolean, default: false } }],
    evidenceUrl: { type: String },
    evidenceType: { type: String, enum: ['photo', 'video'] },
    evidenceLocation: { lat: { type: Number }, lng: { type: Number } },
    isRecurring: { type: Boolean, default: false },
    recurringInterval: { type: String, enum: ['Daily', 'Weekly', 'None'], default: 'None' },
    slaDuration: { type: Number, default: 30 },
    slaStart: { type: Date },
    slaBreached: { type: Boolean, default: false },
    healthScore: { type: Number, default: 100 },
    reworkCount: { type: Number, default: 0 },
    escalationLevel: { type: Number, default: 0 },
    rca: { reason: { type: String }, category: { type: String }, loggedAt: { type: Date } },
    businessImpact: { guestSatisfaction: { type: Number, default: 5 }, revenueImpact: { type: Number, default: 0 }, complianceImpact: { type: Number, default: 0 } },
    geoVerified: { verified: { type: Boolean, default: false }, lat: { type: Number }, lng: { type: Number }, selfieUrl: { type: String }, isSuspicious: { type: Boolean, default: false }, fraudFlags: [{ type: String }] },
    responses: [{ userId: { type: Schema.Types.ObjectId, ref: 'User', required: true }, action: { type: String, enum: ['accepted', 'held', 'rejected', 'completed'], required: true }, reason: { type: String }, timestamp: { type: Date, default: Date.now }, evidenceUrl: { type: String }, evidenceType: { type: String, enum: ['photo', 'video'] } }],
    
    // ✅ NEW: Kanban & Timeline DB Fields
    latestRemark: { type: String },
    holdReason: { type: String },
    completionRemark: { type: String },
    taskHistory: [{
      action: { type: String, required: true },
      remark: { type: String },
      userId: { type: Schema.Types.ObjectId, ref: 'User' },
      userName: { type: String },
      timestamp: { type: Date, default: Date.now }
    }],

    // ✅ NEW: Task Updates Array for Lifecycle Tracking
    taskUpdates: [{
      status: { type: String, required: true },
      description: { type: String },
      reason: { type: String },
      photoUrl: { type: String },
      updatedBy: { type: Schema.Types.ObjectId, ref: 'User', required: false },
      updatedByName: { type: String, required: false },
      department: { type: String },
      designation: { type: String },
      createdAt: { type: Date, default: Date.now }
    }],

    // ✅ NEW: Work Session Tracking
    taskWorkSessions: [{
      startedAt: { type: Date, required: true },
      endedAt: { type: Date },
      duration: { type: Number },
      updateMessage: { type: String },
      evidenceImage: { type: String },
      updatedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
      updatedAt: { type: Date, default: Date.now }
    }],
    totalWorkedMinutes: { type: Number, default: 0 },
    latestUpdate: { type: String },

    viewCount: { type: Number, default: 0 },
    acceptedAt: { type: Date },
    completedAt: { type: Date },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date },
  },
  { timestamps: true }
);

(TaskSchema as any).pre('save', function(this: any, next: Function) {
  if (this.isModified('status')) this.status = normalizeStatus(this.status);
  next();
});

(TaskSchema as any).pre('findOneAndUpdate', function(this: any, next: Function) {
  const update = this.getUpdate() as any;
  if (update.status) update.status = normalizeStatus(update.status);
  next();
});

TaskSchema.index({ hotel: 1, assignedTo: 1 });
TaskSchema.index({ hotel: 1, status: 1 });
TaskSchema.index({ hotel: 1, assignedDepartments: 1 });
TaskSchema.index({ assignedBy: 1, createdAt: -1 });
// Performance Indexes
TaskSchema.index({ dueDate: 1 });
TaskSchema.index({ assignedTo: 1 });
TaskSchema.index({ status: 1 });

export const Task = models.Task || model<ITask>('Task', TaskSchema);