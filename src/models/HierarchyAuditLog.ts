import { Schema, model, models, Document } from 'mongoose';

export interface IHierarchyAuditLog extends Document {
  userId: Schema.Types.ObjectId;
  action: string; // e.g. "ORGANIZATION_CREATED", "DEPARTMENT_CREATED", "INVITE_GENERATED", "JOIN_REQUESTED", "JOIN_APPROVED", "JOIN_REJECTED", "EMPLOYEE_TRANSFERRED", "INVITE_DISABLED"
  details: string; // JSON data
  createdAt: Date;
}

const HierarchyAuditLogSchema = new Schema<IHierarchyAuditLog>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    action: { type: String, required: true },
    details: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  }
);

HierarchyAuditLogSchema.index({ createdAt: -1 });
HierarchyAuditLogSchema.index({ userId: 1 });

export const HierarchyAuditLog = models.HierarchyAuditLog || model<IHierarchyAuditLog>('HierarchyAuditLog', HierarchyAuditLogSchema);
