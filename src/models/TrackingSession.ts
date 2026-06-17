import { Schema, model, models, Document } from 'mongoose';

export interface ITrackingSession extends Document {
  employee: Schema.Types.ObjectId;
  hotel: Schema.Types.ObjectId;
  attendance: Schema.Types.ObjectId;
  department: string;
  role: string;
  startTime: Date;
  endTime?: Date;
  isActive: boolean;
  checkInLatitude?: number;
  checkInLongitude?: number;
  checkInAccuracy?: number;
  checkInAddress?: string;
  checkInPhoto?: string;
  checkInCountry?: string;
  checkInState?: string;
  checkInDistrict?: string;
  checkInCity?: string;
  checkInLocality?: string;
  checkInVillage?: string;
  checkInPostalCode?: string;
  checkOutLatitude?: number;
  checkOutLongitude?: number;
  checkOutAccuracy?: number;
  checkOutAddress?: string;
  checkOutPhoto?: string;
  checkOutCountry?: string;
  checkOutState?: string;
  checkOutDistrict?: string;
  checkOutCity?: string;
  checkOutLocality?: string;
  checkOutVillage?: string;
  checkOutPostalCode?: string;
  totalDistance: number;
  locationUpdateCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const TrackingSessionSchema = new Schema<ITrackingSession>(
  {
    employee: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    hotel: { type: Schema.Types.ObjectId, ref: 'Hotel', required: true },
    attendance: { type: Schema.Types.ObjectId, ref: 'Attendance', required: true },
    department: { type: String },
    role: { type: String },
    startTime: { type: Date, required: true, default: Date.now },
    endTime: { type: Date },
    isActive: { type: Boolean, default: true },
    checkInLatitude: { type: Number },
    checkInLongitude: { type: Number },
    checkInAccuracy: { type: Number },
    checkInAddress: { type: String },
    checkInPhoto: { type: String },
    checkInCountry: { type: String },
    checkInState: { type: String },
    checkInDistrict: { type: String },
    checkInCity: { type: String },
    checkInLocality: { type: String },
    checkInVillage: { type: String },
    checkInPostalCode: { type: String },
    checkOutLatitude: { type: Number },
    checkOutLongitude: { type: Number },
    checkOutAccuracy: { type: Number },
    checkOutAddress: { type: String },
    checkOutPhoto: { type: String },
    checkOutCountry: { type: String },
    checkOutState: { type: String },
    checkOutDistrict: { type: String },
    checkOutCity: { type: String },
    checkOutLocality: { type: String },
    checkOutVillage: { type: String },
    checkOutPostalCode: { type: String },
    totalDistance: { type: Number, default: 0 },
    locationUpdateCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

TrackingSessionSchema.index({ employee: 1, startTime: -1 });
TrackingSessionSchema.index({ hotel: 1, isActive: 1 });
TrackingSessionSchema.index({ attendance: 1 });

export const TrackingSession = models.TrackingSession || model<ITrackingSession>('TrackingSession', TrackingSessionSchema);