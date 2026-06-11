import { Schema, model, models, Document } from 'mongoose';

export interface IComplianceLog extends Document {
  hotel: Schema.Types.ObjectId;
  type: 'Water_Tank' | 'Pest_Control' | 'Property_Audit' | 'CCTV_Verification' | 'Police_Report' | 'Guest_Verification';
  verifiedBy: Schema.Types.ObjectId;
  checklist: {
    name: string;
    checked: boolean;
  }[];
  notes?: string;
  fileUrl?: string;
  date: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ComplianceLogSchema = new Schema<IComplianceLog>(
  {
    hotel: { type: Schema.Types.ObjectId, ref: 'Hotel', required: true },
    type: {
      type: String,
      enum: ['Water_Tank', 'Pest_Control', 'Property_Audit', 'CCTV_Verification', 'Police_Report', 'Guest_Verification'],
      required: true,
    },
    verifiedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    checklist: [
      {
        name: { type: String, required: true },
        checked: { type: Boolean, default: false },
      },
    ],
    notes: { type: String },
    fileUrl: { type: String },
    date: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

ComplianceLogSchema.index({ hotel: 1, type: 1 });

export const ComplianceLog = models.ComplianceLog || model<IComplianceLog>('ComplianceLog', ComplianceLogSchema);
