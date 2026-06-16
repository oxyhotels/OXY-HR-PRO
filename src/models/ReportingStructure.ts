import { Schema, model, models, Document } from 'mongoose';

export interface IReportingStructure extends Document {
  userId: Schema.Types.ObjectId;
  managerId?: Schema.Types.ObjectId;
  departmentId: Schema.Types.ObjectId;
  organizationId: Schema.Types.ObjectId;
  path: string; // Materialized path representation, e.g. "/managerId/userId"
  createdAt: Date;
  updatedAt: Date;
}

const ReportingStructureSchema = new Schema<IReportingStructure>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    managerId: { type: Schema.Types.ObjectId, ref: 'User' },
    departmentId: { type: Schema.Types.ObjectId, ref: 'Department', required: true },
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    path: { type: String, required: true },
  },
  { timestamps: true }
);

ReportingStructureSchema.index({ managerId: 1 });
ReportingStructureSchema.index({ path: 1 });

export const ReportingStructure = models.ReportingStructure || model<IReportingStructure>('ReportingStructure', ReportingStructureSchema);
