import mongoose, { Schema, Document, model, models } from 'mongoose';

export interface IPropertyReport extends Document {
  hotelId: Schema.Types.ObjectId;
  hotelName: string;
  employeeId: Schema.Types.ObjectId;
  employeeName: string;
  managerId: Schema.Types.ObjectId;
  department: string;
  category: string; // DAILY_SALES_REPORT, CASHBOOK, POLICE_REPORT, AD_PHOTO, METER_READING_PHOTO
  taskId?: Schema.Types.ObjectId;
  files: {
    fileUrl: string;
    fileName: string;
    uploadedAt: Date;
  }[];
  remarks?: string;
  status: 'Uploaded' | 'Verified';
  uploadedBy: Schema.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const PropertyReportSchema = new Schema<IPropertyReport>(
  {
    hotelId: { type: Schema.Types.ObjectId, ref: 'Hotel', required: true, index: true },
    hotelName: { type: String, required: true },
    employeeId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    employeeName: { type: String, required: true },
    managerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    department: { type: String, required: true, index: true },
    category: { type: String, required: true, index: true },
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
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  {
    timestamps: true,
  }
);

// Indexes to optimize filters
PropertyReportSchema.index({ hotelId: 1, category: 1 });
PropertyReportSchema.index({ createdAt: -1 });

export default models.PropertyReport || model<IPropertyReport>('PropertyReport', PropertyReportSchema);
