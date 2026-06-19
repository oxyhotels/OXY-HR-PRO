import { Schema, model, models, Document } from 'mongoose';
import { DEPARTMENTS } from '@/constants/departments';

// Course Schema
export interface ICourse extends Document {
  title: string;
  description: string;
  department: string;
  thumbnailUrl?: string;
  bannerUrl?: string;
  category?: string;
  instructorName?: string;
  difficultyLevel?: 'Beginner' | 'Intermediate' | 'Advanced';
  duration?: number; // In minutes
  tags?: string[];
  attachments?: { name: string; fileUrl: string; fileType: string }[];
  isCertificationEnabled?: boolean;
  publishStatus?: 'Draft' | 'Published';
  viewsCount?: number;
  completionsCount?: number;
  modules: {
    title: string;
    videoUrl: string;
    content: string;
    videoType?: 'mp4' | 'youtube' | 'vimeo' | 'doc';
    duration?: number; // in minutes
  }[];
  createdBy?: any;
  createdAt: Date;
  updatedAt: Date;
}

const CourseSchema = new Schema<ICourse>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    department: { type: String, required: true, default: 'Operations' },
    thumbnailUrl: { type: String, default: '' },
    bannerUrl: { type: String, default: '' },
    category: { type: String, default: 'Safety Training' },
    instructorName: { type: String, default: 'OXY Brand Expert' },
    difficultyLevel: { type: String, enum: ['Beginner', 'Intermediate', 'Advanced'], default: 'Beginner' },
    duration: { type: Number, default: 0 },
    tags: [{ type: String }],
    attachments: [
      {
        name: { type: String, required: true },
        fileUrl: { type: String, required: true },
        fileType: { type: String, default: 'PDF' },
      },
    ],
    isCertificationEnabled: { type: Boolean, default: true },
    publishStatus: { type: String, enum: ['Draft', 'Published'], default: 'Published' },
    viewsCount: { type: Number, default: 0 },
    completionsCount: { type: Number, default: 0 },
    modules: [
      {
        title: { type: String, required: true },
        videoUrl: { type: String, required: true },
        content: { type: String, required: true },
        videoType: { type: String, enum: ['mp4', 'youtube', 'vimeo', 'doc'], default: 'mp4' },
        duration: { type: Number, default: 0 },
      },
    ],
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

export const Course = models.Course || model<ICourse>('Course', CourseSchema);

// Assessment Schema
export interface IAssessment extends Document {
  course: Schema.Types.ObjectId;
  questions: {
    question: string;
    options: string[];
    answerIndex: number;
  }[];
  createdAt: Date;
  updatedAt: Date;
}

const AssessmentSchema = new Schema<IAssessment>(
  {
    course: { type: Schema.Types.ObjectId, ref: 'Course', required: true, unique: true },
    questions: [
      {
        question: { type: String, required: true },
        options: [{ type: String, required: true }],
        answerIndex: { type: Number, required: true },
      },
    ],
  },
  { timestamps: true }
);

export const Assessment = models.Assessment || model<IAssessment>('Assessment', AssessmentSchema);

// Certification Schema
export interface ICertification extends Document {
  employee: Schema.Types.ObjectId;
  course: Schema.Types.ObjectId;
  score: number;
  dateObtained: Date;
  createdAt: Date;
  updatedAt: Date;
}

const CertificationSchema = new Schema<ICertification>(
  {
    employee: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    course: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    score: { type: Number, required: true },
    dateObtained: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

CertificationSchema.index({ employee: 1, course: 1 }, { unique: true });

export const Certification = models.Certification || model<ICertification>('Certification', CertificationSchema);

// Watch History Schema
export interface ILmsWatchHistory extends Document {
  employee: Schema.Types.ObjectId;
  course: Schema.Types.ObjectId;
  activeModuleIndex: number;
  watchPercentage: number;
  lastPosition: number; // in seconds
  completedModules: number[]; // Array of completed module indexes
  status: 'In_Progress' | 'Completed';
  createdAt: Date;
  updatedAt: Date;
}

const LmsWatchHistorySchema = new Schema<ILmsWatchHistory>(
  {
    employee: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    course: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    activeModuleIndex: { type: Number, default: 0 },
    watchPercentage: { type: Number, default: 0 },
    lastPosition: { type: Number, default: 0 },
    completedModules: [{ type: Number }],
    status: { type: String, enum: ['In_Progress', 'Completed'], default: 'In_Progress' },
  },
  { timestamps: true }
);

LmsWatchHistorySchema.index({ employee: 1, course: 1 }, { unique: true });

export const LmsWatchHistory = models.LmsWatchHistory || model<ILmsWatchHistory>('LmsWatchHistory', LmsWatchHistorySchema);

// Assignment Schema
export interface ILmsAssignment extends Document {
  course: Schema.Types.ObjectId;
  assignedBy: Schema.Types.ObjectId;
  targetType: 'Employee' | 'Department' | 'Hotel';
  targetEmployee?: Schema.Types.ObjectId;
  targetDepartment?: string;
  targetHotel?: Schema.Types.ObjectId;
  assignedDate: Date;
  dueDate: Date;
  completionStatus: 'Pending' | 'Completed';
  createdAt: Date;
  updatedAt: Date;
}

const LmsAssignmentSchema = new Schema<ILmsAssignment>(
  {
    course: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    assignedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    targetType: { type: String, enum: ['Employee', 'Department', 'Hotel'], required: true },
    targetEmployee: { type: Schema.Types.ObjectId, ref: 'User' },
    targetDepartment: { type: String },
    targetHotel: { type: Schema.Types.ObjectId, ref: 'Hotel' },
    assignedDate: { type: Date, default: Date.now },
    dueDate: { type: Date, required: true },
    completionStatus: { type: String, enum: ['Pending', 'Completed'], default: 'Pending' },
  },
  { timestamps: true }
);

export const LmsAssignment = models.LmsAssignment || model<ILmsAssignment>('LmsAssignment', LmsAssignmentSchema);

// Comment Schema
export interface ILmsComment extends Document {
  course: Schema.Types.ObjectId;
  moduleIndex: number;
  user: Schema.Types.ObjectId;
  comment: string;
  replies: {
    user: Schema.Types.ObjectId;
    reply: string;
    createdAt: Date;
  }[];
  createdAt: Date;
  updatedAt: Date;
}

const LmsCommentSchema = new Schema<ILmsComment>(
  {
    course: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    moduleIndex: { type: Number, required: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    comment: { type: String, required: true, trim: true },
    replies: [
      {
        user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        reply: { type: String, required: true, trim: true },
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

export const LmsComment = models.LmsComment || model<ILmsComment>('LmsComment', LmsCommentSchema);
