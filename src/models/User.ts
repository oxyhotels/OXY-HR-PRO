import { Schema, model, models, Document } from 'mongoose';
import bcrypt from 'bcryptjs';

export type UserRole = 'ROOT_ADMIN' | 'HOTEL_ADMIN' | 'HR_MANAGER' | 'DEPT_MANAGER' | 'EMPLOYEE';

export interface IUser extends Document {
  firstName: string;
  lastName: string;
  email: string;
  password?: string;
  role: UserRole;
  hotel?: Schema.Types.ObjectId; // Empty for ROOT_ADMIN
  department?: string; // e.g. Front Office, Housekeeping, Kitchen, F&B, HR, IT
  designation?: string;
  phone?: string;
  employeeId?: string;
  reportingManager?: string;
  employmentType?: string;
  status: 'Pending' | 'Active' | 'OnLeave' | 'Terminated';
  joinedDate: Date;
  photoUrl?: string;
  aadhaarNumber?: string;
  aadhaarVerified?: boolean;
  panNumber?: string;
  panVerified?: boolean;
  shift?: string;
  emergencyContact?: {
    name: string;
    relation: string;
    phone: string;
  };
  joiningKitStatus: 'NotStarted' | 'InProgress' | 'Submitted' | 'Verified';
  personalDetails?: {
    dob?: Date;
    gender?: 'Male' | 'Female' | 'Other';
    address?: string;
  };
  salaryDetails?: {
    baseSalary: number;
    allowances: { name: string; amount: number }[];
    deductions: { name: string; amount: number }[];
  };
  bankDetails?: {
    accountNo?: string;
    bankName?: string;
    ifsc?: string;
  };
  documents: {
    name: string;
    fileUrl: string;
    uploadedAt: Date;
  }[];
  // Gamification & Operational Tracking
  xp?: number;
  level?: number;
  badges?: string[];
  accountabilityIndex?: number;
  capacityLimit?: number;
  dailyWorkingHours?: number;
  comparePassword(password: string): Promise<boolean>;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, select: false },
    role: {
      type: String,
      enum: ['ROOT_ADMIN', 'HOTEL_ADMIN', 'HR_MANAGER', 'DEPT_MANAGER', 'EMPLOYEE'],
      default: 'EMPLOYEE',
    },
    hotel: { type: Schema.Types.ObjectId, ref: 'Hotel' },
    department: { type: String, trim: true },
    designation: { type: String, trim: true },
    phone: { type: String, trim: true },
    employeeId: { type: String, trim: true },
    reportingManager: { type: String, trim: true },
    employmentType: { type: String, trim: true },
    status: { type: String, enum: ['Pending', 'Active', 'OnLeave', 'Terminated'], default: 'Active' },
    shift: { type: String, default: 'General Shift (09:00 AM - 05:00 PM)' },
    joinedDate: { type: Date, default: Date.now },
    photoUrl: { type: String },
    aadhaarNumber: { type: String, trim: true },
    aadhaarVerified: { type: Boolean, default: false },
    panNumber: { type: String, trim: true },
    panVerified: { type: Boolean, default: false },
    emergencyContact: {
      name: { type: String, trim: true },
      relation: { type: String, trim: true },
      phone: { type: String, trim: true },
    },
    joiningKitStatus: {
      type: String,
      enum: ['NotStarted', 'InProgress', 'Submitted', 'Verified'],
      default: 'NotStarted',
    },
    personalDetails: {
      dob: { type: Date },
      gender: { type: String, enum: ['Male', 'Female', 'Other'] },
      address: { type: String },
    },
    salaryDetails: {
      baseSalary: { type: Number, default: 0 },
      allowances: [
        {
          name: { type: String, required: true },
          amount: { type: Number, required: true },
        },
      ],
      deductions: [
        {
          name: { type: String, required: true },
          amount: { type: Number, required: true },
        },
      ],
    },
    bankDetails: {
      accountNo: { type: String },
      bankName: { type: String },
      ifsc: { type: String },
    },
    documents: [
      {
        name: { type: String, required: true },
        fileUrl: { type: String, required: true },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    // Advanced Execution Metrics
    xp: { type: Number, default: 0 },
    level: { type: Number, default: 1 },
    badges: [{ type: String, default: [] }],
    accountabilityIndex: { type: Number, default: 100 },
    capacityLimit: { type: Number, default: 5 },
    dailyWorkingHours: { type: Number, default: 8 },
  },
  { timestamps: true }
);

// Hash password before saving (Bypassed as per request to store passwords in plain text)
UserSchema.pre<IUser>('save', async function (next) {
  next();
});

// Compare password method
UserSchema.methods.comparePassword = async function (password: string): Promise<boolean> {
  if (!this.password) return false;
  // Check plain text match first
  if (this.password === password) return true;
  // Fallback check for legacy bcrypt hashed passwords
  try {
    return await bcrypt.compare(password, this.password);
  } catch (e) {
    return false;
  }
};

export const User = models.User || model<IUser>('User', UserSchema);
