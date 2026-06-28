import mongoose, { Schema, Document, model, models } from 'mongoose';

export interface IPropertyReport extends Document {
  hotelId: Schema.Types.ObjectId;
  hotelName: string;
  hotelCode: string;
  employeeId: Schema.Types.ObjectId;
  employeeName: string;
  managerId: Schema.Types.ObjectId;
  department: string;
  category: string; // Used as reportType in frontend (DAILY_SALES_REPORT, CASHBOOK, etc)
  reportType: string;
  reportDate: Date; // NEW: The actual date of the report
  uploadedAt: Date; // NEW: The timestamp of upload
  taskId?: Schema.Types.ObjectId;
  files: {
    fileUrl: string;
    fileName: string;
    uploadedAt: Date;
  }[];
  remarks?: string;
  status: 'Uploaded' | 'Verified';
  deleteStatus: 'ACTIVE' | 'PENDING_DELETE' | 'DELETED';
  deleteRequest?: {
    reason: string;
    requestedBy: Schema.Types.ObjectId;
    requestedAt: Date;
  };
  auditLogs: {
    action: string;
    by: Schema.Types.ObjectId;
    byName: string;
    at: Date;
    reason?: string;
  }[];
  uploadedBy: Schema.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const PropertyReportSchema = new Schema<IPropertyReport>(
  {
    hotelId: { type: Schema.Types.ObjectId, ref: 'Hotel', required: true, index: true },
    hotelName: { type: String, required: true },
    hotelCode: { type: String, required: true },
    employeeId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    employeeName: { type: String, required: true },
    managerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    department: { type: String, required: true, index: true },
    category: { type: String, required: true, index: true },
    reportType: { type: String },
    reportDate: { type: Date, required: true, index: true },
    uploadedAt: { type: Date, default: Date.now, index: true },
    taskId: { type: Schema.Types.ObjectId, ref: 'Task' },
    files: [
      {
        fileUrl: { type: String, required: true },
        fileName: { type: String, required: true },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    remarks: { type: String },
    status: { type: String, enum: ['Uploaded', 'Verified'], default: 'Uploaded' },
    deleteStatus: { type: String, enum: ['ACTIVE', 'PENDING_DELETE', 'DELETED'], default: 'ACTIVE', index: true },
    deleteRequest: {
      reason: { type: String },
      requestedBy: { type: Schema.Types.ObjectId, ref: 'User' },
      requestedAt: { type: Date },
    },
    auditLogs: [
      {
        action: { type: String },
        by: { type: Schema.Types.ObjectId, ref: 'User' },
        byName: { type: String },
        at: { type: Date, default: Date.now },
        reason: { type: String },
      }
    ],
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  {
    timestamps: true,
  }
);

// Indexes to optimize filters
PropertyReportSchema.index({ hotelId: 1, category: 1, reportDate: -1 });
PropertyReportSchema.index({ uploadedAt: -1 });
PropertyReportSchema.index({ deleteStatus: 1 });

export default models.PropertyReport || model<IPropertyReport>('PropertyReport', PropertyReportSchema);
