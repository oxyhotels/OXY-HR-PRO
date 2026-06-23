import { Schema, model, models, Document } from 'mongoose';

export interface IInviteLink extends Document {
  inviteCode: string;
  inviteLink: string;
  qrCode: string;
  organizationId: Schema.Types.ObjectId;
  departmentId: Schema.Types.ObjectId;
  managerId: Schema.Types.ObjectId;
  createdBy: Schema.Types.ObjectId;
  expiresAt?: Date;
  status: 'Active' | 'Disabled' | 'ACTIVE' | 'EXPIRED' | 'DISABLED';
  inviteType?: 'employee' | 'manager';
  createdAt: Date;
  updatedAt: Date;
  
  // New fields
  qrId?: string;
  createdByRole?: string;
  parentNodeId?: Schema.Types.ObjectId;
  parentManagerId?: Schema.Types.ObjectId;
  department?: string;
  role?: string;
  token?: string;
  expiryDate?: Date;
}

const InviteLinkSchema = new Schema<IInviteLink>(
  {
    inviteCode: { type: String, required: true, unique: true, trim: true },
    inviteLink: { type: String, required: true },
    qrCode: { type: String, required: true },
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    departmentId: { type: Schema.Types.ObjectId, ref: 'Department', required: true },
    managerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    expiresAt: { type: Date },
    status: { type: String, enum: ['Active', 'Disabled', 'ACTIVE', 'EXPIRED', 'DISABLED'], default: 'Active' },
    inviteType: { type: String, enum: ['employee', 'manager'], default: 'employee' },
    
    // New fields
    qrId: { type: String },
    createdByRole: { type: String },
    parentNodeId: { type: Schema.Types.ObjectId, ref: 'HierarchyNode' },
    parentManagerId: { type: Schema.Types.ObjectId, ref: 'User' },
    department: { type: String },
    role: { type: String },
    token: { type: String },
    expiryDate: { type: Date }
  },
  { timestamps: true }
);

InviteLinkSchema.index({ managerId: 1 });

export const InviteLink = models.InviteLink || model<IInviteLink>('InviteLink', InviteLinkSchema);
