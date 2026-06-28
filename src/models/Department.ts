import { Schema, model, models, Document } from 'mongoose';

export interface IDepartment extends Document {
  name: string;
  organization?: Schema.Types.ObjectId;
  hotel?: Schema.Types.ObjectId;
  manager?: Schema.Types.ObjectId;
  createdBy?: Schema.Types.ObjectId;
  code?: string;
  description?: string;
  status?: 'Active' | 'Inactive';
  isActive: boolean;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const DepartmentSchema = new Schema<IDepartment>(
  {
    name: { type: String, required: true, trim: true },
    organization: { type: Schema.Types.ObjectId, ref: 'Organization' },
    hotel: { type: Schema.Types.ObjectId, ref: 'Hotel' },
    manager: { type: Schema.Types.ObjectId, ref: 'User' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    code: { type: String, trim: true },
    description: { type: String, trim: true },
    status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
    isActive: { type: Boolean, default: true },
    isDefault: { type: Boolean, default: false },
  },
  { timestamps: true, collation: { locale: 'en', strength: 2 } }
);

// Department names must be globally unique (case-insensitive via collation)
DepartmentSchema.index({ name: 1 }, { unique: true });

export const Department = models.Department || model<IDepartment>('Department', DepartmentSchema);
