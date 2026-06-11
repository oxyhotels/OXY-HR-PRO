import { Schema, model, models, Document } from 'mongoose';

export type IncidentCategory = 'Fire' | 'Guest_Injury' | 'Security_Threat' | 'Water_Leakage' | 'Electrical_Failure';
export type IncidentStatus = 'Active' | 'Under_Control' | 'Resolved';

export interface IIncident extends Document {
  title: string;
  description: string;
  hotel: Schema.Types.ObjectId;
  category: IncidentCategory;
  status: IncidentStatus;
  timeline: { message: string; timestamp: Date }[];
  rca?: {
    rootCause: string;
    preventAction: string;
  };
  recoverySteps: string[];
  loggedBy: Schema.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const IncidentSchema = new Schema<IIncident>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    hotel: { type: Schema.Types.ObjectId, ref: 'Hotel', required: true },
    category: {
      type: String,
      enum: ['Fire', 'Guest_Injury', 'Security_Threat', 'Water_Leakage', 'Electrical_Failure'],
      required: true,
    },
    status: {
      type: String,
      enum: ['Active', 'Under_Control', 'Resolved'],
      default: 'Active',
    },
    timeline: [
      {
        message: { type: String, required: true },
        timestamp: { type: Date, default: Date.now },
      },
    ],
    rca: {
      rootCause: { type: String },
      preventAction: { type: String },
    },
    recoverySteps: [{ type: String }],
    loggedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

IncidentSchema.index({ hotel: 1, status: 1 });

export const Incident = models.Incident || model<IIncident>('Incident', IncidentSchema);
