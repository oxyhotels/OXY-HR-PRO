import { Schema, model, models, Document } from 'mongoose';

export interface IBreak {
  start: Date;
  end?: Date;
}

export interface IAttendance extends Document {
  employee: Schema.Types.ObjectId;
  hotel: Schema.Types.ObjectId;
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
    hotel: { type: Schema.Types.ObjectId, ref: 'Hotel', required: true },
    date: { type: String, required: true }, // Format: YYYY-MM-DD
    checkIn: { type: Date, required: true },
    checkOut: { type: Date },
    breaks: [
      {
        start: { type: Date, required: true },
        end: { type: Date },
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
