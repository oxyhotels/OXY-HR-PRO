import { Schema, model, models, Document } from 'mongoose';

export interface IBreak {
  start: Date;
  end?: Date;
  latitude?: number;
  longitude?: number;
  address?: string;
}

export interface IAttendance extends Document {
  employee: Schema.Types.ObjectId;
  hotel?: Schema.Types.ObjectId; // ✅ FIX: Made optional for Global IT/HR
  date: string; // YYYY-MM-DD format
  checkIn: Date;
  checkOut?: Date;
  breaks: IBreak[];
  totalWorkingHours: number; // Excludes break times
  totalBreakMinutes: number;
  status: 'Present' | 'Absent' | 'Late' | 'Half-Day' | 'OnLeave';
  selfieUrl?: string;
  checkInCoordinates?: { lat: number; lng: number };
  checkOutCoordinates?: { lat: number; lng: number };
  checkInLatitude?: number;
  checkInLongitude?: number;
  checkInAccuracy?: number;
  checkInPhoto?: string;
  checkOutLatitude?: number;
  checkOutLongitude?: number;
  checkOutAccuracy?: number;
  checkOutPhoto?: string;
  deviceInfo?: string;
  browserInfo?: string;
  ipAddress?: string;
  checkInAddress?: string;
  checkOutAddress?: string;
  department?: string;
  country?: string;
  state?: string;
  district?: string;
  city?: string;
  locality?: string;
  village?: string;
  road?: string;
  postalCode?: string;
  gpsAccuracy?: number;
  locationSource?: string;
  deviceFingerprint?: string;
  browserAgent?: string;
  os?: string;
  gpsEnabled?: boolean;
  checkInSelfie?: string;
  checkOutCountry?: string;
  checkOutState?: string;
  checkOutDistrict?: string;
  checkOutCity?: string;
  checkOutLocality?: string;
  checkOutVillage?: string;
  checkOutSelfie?: string;
  workDescription?: string;
  workPictureUrl?: string;
  workVideoUrl?: string;
  logs: {
    action: string;
    time: Date;
    notes?: string;
  }[];
  createdAt: Date;
  updatedAt: Date;
}

const AttendanceSchema = new Schema<IAttendance>(
  {
    employee: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    hotel: { type: Schema.Types.ObjectId, ref: 'Hotel' }, // ✅ FIX: Removed required: true
    date: { type: String, required: true }, // Format: YYYY-MM-DD
    checkIn: { type: Date, required: true },
    checkOut: { type: Date },
    breaks: [
      {
        start: { type: Date, required: true },
        end: { type: Date },
        latitude: { type: Number },
        longitude: { type: Number },
        address: { type: String },
      },
    ],
    totalWorkingHours: { type: Number, default: 0 },
    totalBreakMinutes: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['Present', 'Absent', 'Late', 'Half-Day', 'OnLeave'],
      default: 'Present',
    },
    selfieUrl: { type: String },
    checkInCoordinates: {
      lat: { type: Number },
      lng: { type: Number },
    },
    checkOutCoordinates: {
      lat: { type: Number },
      lng: { type: Number },
    },
    checkInLatitude: { type: Number },
    checkInLongitude: { type: Number },
    checkInAccuracy: { type: Number },
    checkInPhoto: { type: String },
    checkOutLatitude: { type: Number },
    checkOutLongitude: { type: Number },
    checkOutAccuracy: { type: Number },
    checkOutPhoto: { type: String },
    deviceInfo: { type: String },
    browserInfo: { type: String },
    ipAddress: { type: String },
    checkInAddress: { type: String },
    checkOutAddress: { type: String },
    department: { type: String },
    country: { type: String },
    state: { type: String },
    district: { type: String },
    city: { type: String },
    locality: { type: String },
    village: { type: String },
    road: { type: String },
    postalCode: { type: String },
    gpsAccuracy: { type: Number },
    locationSource: { type: String },
    deviceFingerprint: { type: String },
    browserAgent: { type: String },
    os: { type: String },
    gpsEnabled: { type: Boolean },
    checkInSelfie: { type: String },
    checkOutCountry: { type: String },
    checkOutState: { type: String },
    checkOutDistrict: { type: String },
    checkOutCity: { type: String },
    checkOutLocality: { type: String },
    checkOutVillage: { type: String },
    checkOutSelfie: { type: String },
    workDescription: { type: String },
    workPictureUrl: { type: String },
    workVideoUrl: { type: String },
    logs: [
      {
        action: { type: String, required: true },
        time: { type: Date, default: Date.now },
        notes: { type: String },
      },
    ],
  },
  { timestamps: true }
);

// Index to quickly search attendance by employee, hotel and date
AttendanceSchema.index({ employee: 1, date: 1 }, { unique: true });
AttendanceSchema.index({ hotel: 1, date: 1 });

export const Attendance = models.Attendance || model<IAttendance>('Attendance', AttendanceSchema);