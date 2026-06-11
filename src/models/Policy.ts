import { Schema, model, models, Document } from 'mongoose';

export interface IPolicy extends Document {
  title: string;
  content: string;
  fileUrl?: string;
  signedByUsers: {
    user: Schema.Types.ObjectId;
    signedAt: Date;
  }[];
  createdAt: Date;
  updatedAt: Date;
}

const PolicySchema = new Schema<IPolicy>(
  {
    title: { type: String, required: true, trim: true },
    content: { type: String, required: true },
    fileUrl: { type: String },
    signedByUsers: [
      {
        user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        signedAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

export const Policy = models.Policy || model<IPolicy>('Policy', PolicySchema);
