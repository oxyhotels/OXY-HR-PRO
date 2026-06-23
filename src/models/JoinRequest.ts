import { Schema, model, models, Document } from 'mongoose';

export interface IJoinRequest extends Document {
  inviteCode: string;
  organizationId: Schema.Types.ObjectId;
  departmentId: Schema.Types.ObjectId;
  managerId: Schema.Types.ObjectId;
  name: string;
  email: string;
  mobile: string;
  employeeId: string;
  designation: string;
  password?: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  joinRole?: string;
  invitedById?: Schema.Types.ObjectId;
  hierarchyLevel?: number;
  rejectionReason?: string;
  state?: string;
  district?: string;
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
  documents?: {
    name: string;
    fileUrl: string;
    uploadedAt: Date;
  }[];
  aadhaarNumber?: string;
  panNumber?: string;
  bankName?: string;
  accountNo?: string;
  ifsc?: string;
  emergencyContactName?: string;
  emergencyContactRelation?: string;
  emergencyContactPhone?: string;
  joiningDate?: string;
  employmentType?: string;
  salary?: string;
  reportingManager?: string;
  createdAt: Date;
  updatedAt: Date;
}

const JoinRequestSchema = new Schema<IJoinRequest>(
  {
    inviteCode: { type: String, required: true, trim: true },
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    departmentId: { type: Schema.Types.ObjectId, ref: 'Department', required: true },
    managerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    mobile: { type: String, required: true, trim: true },
    employeeId: { type: String, required: true, trim: true },
    designation: { type: String, required: true, trim: true },
    password: { type: String, required: true },
    status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' },
    joinRole: { type: String, default: 'EMPLOYEE' },
    invitedById: { type: Schema.Types.ObjectId, ref: 'User' },
    hierarchyLevel: { type: Number },
    rejectionReason: { type: String },
    state: { type: String, trim: true },
    district: { type: String, trim: true },
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
      verified: { type: Boolean, default: false },
      verifiedAt: { type: Date },
    },
    documents: [
      {
        name: { type: String, required: true },
        fileUrl: { type: String, required: true },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    aadhaarNumber: { type: String, trim: true },
    panNumber: { type: String, trim: true },
    bankName: { type: String, trim: true },
    accountNo: { type: String, trim: true },
    ifsc: { type: String, trim: true },
    emergencyContactName: { type: String, trim: true },
    emergencyContactRelation: { type: String, trim: true },
    emergencyContactPhone: { type: String, trim: true },
    joiningDate: { type: String, trim: true },
    employmentType: { type: String, trim: true },
    salary: { type: String, trim: true },
    reportingManager: { type: String, trim: true },
  },
  { timestamps: true }
);

JoinRequestSchema.index({ managerId: 1, status: 1 });
JoinRequestSchema.index({ email: 1 });

export const JoinRequest = models.JoinRequest || model<IJoinRequest>('JoinRequest', JoinRequestSchema);
