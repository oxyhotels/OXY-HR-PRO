import { Schema, model, models, Document } from 'mongoose';

export interface IJoinRequest extends Document {
  inviteCode: string;
  organizationId: Schema.Types.ObjectId;
  departmentId: Schema.Types.ObjectId;
  managerId: Schema.Types.ObjectId;
  name: string;
  email: string;
  mobile: string;
  employeeId: string;
  designation: string;
  password?: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  joinRole?: string;
  invitedById?: Schema.Types.ObjectId;
  hierarchyLevel?: number;
  rejectionReason?: string;
  state?: string;
  district?: string;
  createdAt: Date;
  updatedAt: Date;
}

const JoinRequestSchema = new Schema<IJoinRequest>(
  {
    inviteCode: { type: String, required: true, trim: true },
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    departmentId: { type: Schema.Types.ObjectId, ref: 'Department', required: true },
    managerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    mobile: { type: String, required: true, trim: true },
    employeeId: { type: String, required: true, trim: true },
    designation: { type: String, required: true, trim: true },
    password: { type: String, required: true },
    status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' },
    joinRole: { type: String, default: 'EMPLOYEE' },
    invitedById: { type: Schema.Types.ObjectId, ref: 'User' },
    hierarchyLevel: { type: Number },
    rejectionReason: { type: String },
    state: { type: String, trim: true },
    district: { type: String, trim: true },
  },
  { timestamps: true }
);

JoinRequestSchema.index({ managerId: 1, status: 1 });
JoinRequestSchema.index({ email: 1 });

export const JoinRequest = models.JoinRequest || model<IJoinRequest>('JoinRequest', JoinRequestSchema);
