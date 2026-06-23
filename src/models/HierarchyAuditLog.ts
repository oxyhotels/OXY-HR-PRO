import { Schema, model, models, Document } from 'mongoose';

export interface IHierarchyAuditLog extends Document {
  userId: Schema.Types.ObjectId;
  action: string; // e.g. "ORGANIZATION_CREATED", "DEPARTMENT_CREATED", "INVITE_GENERATED", "JOIN_REQUESTED", "JOIN_APPROVED", "JOIN_REJECTED", "EMPLOYEE_TRANSFERRED", "INVITE_DISABLED"
  details: string; // JSON data
  module?: string; // e.g. "Employee" | "Manager" | "Department" | "Property" | "Hierarchy"
  oldValue?: string;
  newValue?: string;
  editedByRole?: string;
  ipAddress?: string;
  targetUserId?: Schema.Types.ObjectId;
  targetId?: string;
  createdAt: Date;
}

const HierarchyAuditLogSchema = new Schema<IHierarchyAuditLog>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    action: { type: String, required: true },
    details: { type: String, required: true },
    module: { type: String },
    oldValue: { type: String },
    newValue: { type: String },
    editedByRole: { type: String },
    ipAddress: { type: String },
    targetUserId: { type: Schema.Types.ObjectId, ref: 'User' },
    targetId: { type: String },
    createdAt: { type: Date, default: Date.now },
  }
);

HierarchyAuditLogSchema.index({ createdAt: -1 });
HierarchyAuditLogSchema.index({ userId: 1 });
HierarchyAuditLogSchema.index({ module: 1 });
HierarchyAuditLogSchema.index({ targetUserId: 1 });

export const HierarchyAuditLog = models.HierarchyAuditLog || model<IHierarchyAuditLog>('HierarchyAuditLog', HierarchyAuditLogSchema);
