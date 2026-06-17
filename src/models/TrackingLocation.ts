import { Schema, model, models, Document } from 'mongoose';

export interface ITrackingLocation extends Document {
  session: Schema.Types.ObjectId;
  employee: Schema.Types.ObjectId;
  hotel: Schema.Types.ObjectId;
  latitude: number;
  longitude: number;
  accuracy: number;
  address: string;
  country?: string;
  state?: string;
  district?: string;
  city?: string;
  locality?: string;
  village?: string;
  postalCode?: string;
  timestamp: Date;
  createdAt: Date;
}

const TrackingLocationSchema = new Schema<ITrackingLocation>(
  {
    session: { type: Schema.Types.ObjectId, ref: 'TrackingSession', required: true },
    employee: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    hotel: { type: Schema.Types.ObjectId, ref: 'Hotel', required: true },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    accuracy: { type: Number, required: true },
    address: { type: String, required: true },
    country: { type: String },
    state: { type: String },
    district: { type: String },
    city: { type: String },
    locality: { type: String },
    village: { type: String },
    postalCode: { type: String },
    timestamp: { type: Date, required: true, default: Date.now },
  },
  { timestamps: true }
);

TrackingLocationSchema.index({ session: 1, timestamp: -1 });
TrackingLocationSchema.index({ employee: 1, timestamp: -1 });
TrackingLocationSchema.index({ hotel: 1, timestamp: -1 });

export const TrackingLocation = models.TrackingLocation || model<ITrackingLocation>('TrackingLocation', TrackingLocationSchema);