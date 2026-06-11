import { Schema, model, models, Document } from 'mongoose';

export interface IAuditLog extends Document {
  user: Schema.Types.ObjectId;
  hotel?: Schema.Types.ObjectId; // Optional for ROOT_ADMIN logs
  action: string; // e.g. "LOGIN", "CREATE_EMPLOYEE", "APPROVE_LEAVE", "CALCULATE_PAYROLL"
  module: string; // e.g. "AUTH", "EMPLOYEE", "LEAVE", "PAYROLL"
  details: string; // JSON string or human readable details
  ipAddress?: string;
  timestamp: Date;
}

const AuditLogSchema = new Schema<IAuditLog>({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  hotel: { type: Schema.Types.ObjectId, ref: 'Hotel' },
  action: { type: String, required: true, trim: true },
  module: { type: String, required: true, trim: true },
  details: { type: String, required: true, trim: true },
  ipAddress: { type: String },
  timestamp: { type: Date, default: Date.now },
});

AuditLogSchema.index({ hotel: 1, timestamp: -1 });

export const AuditLog = models.AuditLog || model<IAuditLog>('AuditLog', AuditLogSchema);
