import { Schema, model, models, Document } from 'mongoose';
import { DEPARTMENTS } from '@/constants/departments';

export interface IDepartment extends Document {
  name: string;
  organization: Schema.Types.ObjectId;
  hotel?: Schema.Types.ObjectId;
  manager?: Schema.Types.ObjectId;
  code?: string;
  description?: string;
  status?: 'Active' | 'Inactive';
  createdAt: Date;
  updatedAt: Date;
}

const DepartmentSchema = new Schema<IDepartment>(
  {
    name: { type: String, required: true, trim: true },
    organization: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    hotel: { type: Schema.Types.ObjectId, ref: 'Hotel' },
    manager: { type: Schema.Types.ObjectId, ref: 'User' },
    code: { type: String, trim: true },
    description: { type: String, trim: true },
    status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
  },
  { timestamps: true }
);

// Department names should be unique within the same organization
DepartmentSchema.index({ organization: 1, name: 1 }, { unique: true });

export const Department = models.Department || model<IDepartment>('Department', DepartmentSchema);
