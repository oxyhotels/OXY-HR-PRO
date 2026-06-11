import { Schema, model, models, Document } from 'mongoose';

// Course Schema
export interface ICourse extends Document {
  title: string;
  description: string;
  department: string; // Course target department
  modules: {
    title: string;
    videoUrl: string;
    content: string;
  }[];
  createdAt: Date;
  updatedAt: Date;
}

const CourseSchema = new Schema<ICourse>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    department: { type: String, required: true, default: 'Operations' },
    modules: [
      {
        title: { type: String, required: true },
        videoUrl: { type: String, required: true },
        content: { type: String, required: true },
      },
    ],
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
    answerIndex: number; // Index of the correct option
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
