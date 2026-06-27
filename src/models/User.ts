import { Schema, model, models, Document } from 'mongoose';
import bcrypt from 'bcryptjs';

import { DEPARTMENTS } from '@/constants/departments';

export type UserRole = 'ROOT_ADMIN' | 'HOTEL_ADMIN' | 'HR_MANAGER' | 'DEPT_MANAGER' | 'EMPLOYEE';

export interface IUser extends Document {
  firstName: string;
  lastName: string;
  email: string;
  password?: string;
  role: UserRole;
  hotel?: Schema.Types.ObjectId; // Empty for ROOT_ADMIN
  department?: string; // e.g. Front Office, Housekeeping, Kitchen, F&B, HR, IT
  category?: string; // e.g. IT Support, Recruitment, etc.
  designation?: string;
  phone?: string;
  employeeId?: string;
  reportingManager?: string;
  employmentType?: string;
  status: 'Pending' | 'Active' | 'OnLeave' | 'Terminated' | 'Basic Registered';
  joinedDate: Date;
  photoUrl?: string;
  aadhaarNumber?: string;
  aadhaarVerified?: boolean;
  panNumber?: string;
  panVerified?: boolean;
  shift?: string;
  shiftType?: string;
  shiftName?: string;
  startTime?: string;
  endTime?: string;
  totalHours?: number;
  isCustom?: boolean;
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
  homeLocation?: {
    address: string;
    latitude: number;
    longitude: number;
    state: string;
    district: string;
    city: string;
    pincode: string;
    locationVerified: boolean;
    googleMapLink?: string;
    placeId?: string;
    verified?: boolean;
    verifiedAt?: Date;

  };
  // Gamification & Operational Tracking
  xp?: number;
  level?: number;
  badges?: string[];
  accountabilityIndex?: number;
  capacityLimit?: number;
  dailyWorkingHours?: number;
  enabledFeatures?: string[];
  hierarchyLevel?: number;
  hierarchyPath?: string;
  parentManagerId?: Schema.Types.ObjectId;
  invitedById?: Schema.Types.ObjectId;
  approvedBy?: Schema.Types.ObjectId;
  approvedAt?: Date;
  state?: string;
  district?: string;
  parentId?: Schema.Types.ObjectId;
  rootAdminId?: Schema.Types.ObjectId;
  employeeCode?: string;
  managerCode?: string;
  reportingManagerId?: string;
  reportingManagerName?: string;
  reportingManagerCode?: string;
  reportingManagerDepartment?: string;
  reportingManagerProperty?: string;
  editAuditLog?: {
    updatedBy: string;
    role: string;
    date: Date;
  }[];
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
    category: { type: String, trim: true },
    designation: { type: String, trim: true },
    phone: { type: String, trim: true },
    employeeId: { type: String, trim: true },
    reportingManager: { type: String, trim: true },
    reportingManagerId: { type: String, trim: true },
    reportingManagerName: { type: String, trim: true },
    reportingManagerCode: { type: String, trim: true },
    reportingManagerDepartment: { type: String, trim: true },
    reportingManagerProperty: { type: String, trim: true },
    employmentType: { type: String, trim: true },
    status: { type: String, enum: ['Pending', 'Active', 'OnLeave', 'Terminated', 'Basic Registered'], default: 'Active' },
    shift: { type: String, default: 'General Shift (09:00 AM - 05:00 PM)' },
    shiftType: { type: String },
    shiftName: { type: String },
    startTime: { type: String },
    endTime: { type: String },
    totalHours: { type: Number },
    isCustom: { type: Boolean, default: false },
    enabledFeatures: {
      type: [String],
      default: [
        'organisationSettings',
        'rightsManagement',
        'shiftManagement',
        'organisationCategories',
        'liveLocationSettings',
        'employeeConfiguration',
        'shiftMaster',
        'approverManagement',
        'holidays',
        'bulkMaster',
        'payroll',
        'mySubscription',
        'groupMaster',
        'googleCalendarSettings'
      ]
    },
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
    homeLocation: {
      address: { type: String },
      latitude: { type: Number },
      longitude: { type: Number },
      state: { type: String },
      district: { type: String },
      city: { type: String },
      pincode: { type: String },
      locationVerified: { type: Boolean, default: false },
      googleMapLink: { type: String },
      placeId: { type: String },
      verified: { type: Boolean },
      verifiedAt: { type: Date }

    },
    // Advanced Execution Metrics
    xp: { type: Number, default: 0 },
    level: { type: Number, default: 1 },
    badges: [{ type: String, default: [] }],
    accountabilityIndex: { type: Number, default: 100 },
    capacityLimit: { type: Number, default: 5 },
    dailyWorkingHours: { type: Number, default: 8 },
    hierarchyLevel: { type: Number },
    hierarchyPath: { type: String },
    parentManagerId: { type: Schema.Types.ObjectId, ref: 'User' },
    invitedById: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date },
    state: { type: String, trim: true },
    district: { type: String, trim: true },
    parentId: { type: Schema.Types.ObjectId, ref: 'User' },
    rootAdminId: { type: Schema.Types.ObjectId, ref: 'User' },
    employeeCode: { type: String },
    managerCode: { type: String },
    editAuditLog: [
      {
        updatedBy: { type: String },
        role: { type: String },
        date: { type: Date, default: Date.now }
      }
    ]
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

UserSchema.index({ hotel: 1 });
UserSchema.index({ role: 1 });
UserSchema.index({ status: 1 });

// Add Indexes for Performance Optimization
UserSchema.index({ email: 1 });
UserSchema.index({ phone: 1 });
UserSchema.index({ role: 1 });
UserSchema.index({ department: 1 });
UserSchema.index({ hotel: 1 });
UserSchema.index({ employeeCode: 1 });

export const User = models.User || model<IUser>('User', UserSchema);
