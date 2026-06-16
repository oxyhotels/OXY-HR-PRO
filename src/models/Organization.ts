import { Schema, model, models, Document } from 'mongoose';

export interface IOrganization extends Document {
  name: string;
  code?: string;
  createdAt: Date;
  updatedAt: Date;
}

const OrganizationSchema = new Schema<IOrganization>(
  {
    name: { type: String, required: true, unique: true, trim: true },
    code: { type: String, uppercase: true, trim: true },
  },
  { timestamps: true }
);

export const Organization = models.Organization || model<IOrganization>('Organization', OrganizationSchema);
