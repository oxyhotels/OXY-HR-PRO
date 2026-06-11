import { Schema, model, models, Document } from 'mongoose';

export interface IAIPerformance extends Document {
  employee: Schema.Types.ObjectId;
  month: number;
  year: number;
  scores: {
    productivity: number; // 0-100
    attendance: number;   // 0-100
    discipline: number;   // 0-100
    training: number;     // 0-100
    kpi: number;          // 0-100
    guestSatisfaction: number; // 0-100
  };
  opiScore: number;       // OXY Performance Index: average or weighted score (0-100)
  promotionRecommendation: 'Highly Recommended' | 'Recommended' | 'None' | 'Under Review';
  warningRecommendation: 'None' | 'Verbal Warning' | 'Written Warning' | 'Performance Improvement Plan';
  summary: string;
  generatedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const AIPerformanceSchema = new Schema<IAIPerformance>(
  {
    employee: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    month: { type: Number, required: true },
    year: { type: Number, required: true },
    scores: {
      productivity: { type: Number, default: 80 },
      attendance: { type: Number, default: 85 },
      discipline: { type: Number, default: 90 },
      training: { type: Number, default: 75 },
      kpi: { type: Number, default: 80 },
      guestSatisfaction: { type: Number, default: 85 },
    },
    opiScore: { type: Number, required: true },
    promotionRecommendation: {
      type: String,
      enum: ['Highly Recommended', 'Recommended', 'None', 'Under Review'],
      default: 'None',
    },
    warningRecommendation: {
      type: String,
      enum: ['None', 'Verbal Warning', 'Written Warning', 'Performance Improvement Plan'],
      default: 'None',
    },
    summary: { type: String, required: true },
    generatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

AIPerformanceSchema.index({ employee: 1, year: 1, month: 1 }, { unique: true });

export const AIPerformance = models.AIPerformance || model<IAIPerformance>('AIPerformance', AIPerformanceSchema);
