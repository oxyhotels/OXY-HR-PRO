import { Schema, model, models, Document } from 'mongoose';

// ─────────────────────────────────────────────
//  XP Event Log — every time XP/Coins are earned
// ─────────────────────────────────────────────
export type XpEventType =
  | 'ATTENDANCE_PRESENT'
  | 'ATTENDANCE_CHECK_OUT'
  | 'ATTENDANCE_EARLY'
  | 'ATTENDANCE_PERFECT_DAY'
  | 'ATTENDANCE_STREAK_3'
  | 'ATTENDANCE_STREAK_7'
  | 'ATTENDANCE_STREAK_15'
  | 'ATTENDANCE_STREAK_30'
  | 'ATTENDANCE_STREAK_60'
  | 'ATTENDANCE_STREAK_100'
  | 'TASK_COMPLETED'
  | 'TASK_HIGH_PRIORITY'
  | 'TASK_BEFORE_DEADLINE'
  | 'LMS_MODULE_WATCHED'
  | 'LMS_COURSE_COMPLETED'
  | 'LMS_CERTIFICATION_EARNED'
  | 'QUIZ_PASS'
  | 'WORK_REPORT_SUBMITTED'
  | 'POSITIVE_GUEST_REVIEW'
  | 'MANAGER_APPRECIATION'
  | 'LEVEL_UP'
  | 'BADGE_EARNED';

export interface IXpEvent extends Document {
  employee: Schema.Types.ObjectId;
  hotel: Schema.Types.ObjectId;
  eventType: XpEventType;
  xpEarned: number;
  coinsEarned: number;
  starsEarned: number;
  description: string;
  date: string; // YYYY-MM-DD
  month: number;
  year: number;
  createdAt: Date;
}

const XpEventSchema = new Schema<IXpEvent>(
  {
    employee: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    hotel: { type: Schema.Types.ObjectId, ref: 'Hotel', required: true },
    eventType: { type: String, required: true },
    xpEarned: { type: Number, default: 0 },
    coinsEarned: { type: Number, default: 0 },
    starsEarned: { type: Number, default: 0 },
    description: { type: String, required: true },
    date: { type: String, required: true },
    month: { type: Number, required: true },
    year: { type: Number, required: true },
  },
  { timestamps: true }
);

XpEventSchema.index({ employee: 1, date: 1 });
XpEventSchema.index({ hotel: 1, month: 1, year: 1 });

export const XpEvent = models.XpEvent || model<IXpEvent>('XpEvent', XpEventSchema);

// ─────────────────────────────────────────────
//  Employee Gamification Profile — aggregated stats
// ─────────────────────────────────────────────
export interface IBadge {
  id: string;
  name: string;
  icon: string;
  description: string;
  earnedAt: Date;
  tier: 'Bronze' | 'Silver' | 'Gold' | 'Platinum' | 'Diamond';
}

export interface IGamificationProfile extends Document {
  employee: Schema.Types.ObjectId;
  hotel: Schema.Types.ObjectId;

  // Core currency
  totalXp: number;
  totalCoins: number;
  totalStars: number;

  // Level progression  (1-10)
  level: number;
  xpToNextLevel: number;

  // Streak engine
  currentStreak: number;
  longestStreak: number;
  lastAttendanceDate: string; // YYYY-MM-DD

  // Badges
  badges: IBadge[];

  // Monthly snapshot
  monthlyXp: number;
  monthlyCoins: number;
  currentMonth: number;
  currentYear: number;

  // Coins available for redemption
  availableCoins: number;
  redeemedCoins: number;

  createdAt: Date;
  updatedAt: Date;
}

const BadgeSchema = new Schema<IBadge>(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
    icon: { type: String, required: true },
    description: { type: String, required: true },
    earnedAt: { type: Date, default: Date.now },
    tier: { type: String, enum: ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond'], default: 'Bronze' },
  },
  { _id: false }
);

const GamificationProfileSchema = new Schema<IGamificationProfile>(
  {
    employee: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    hotel: { type: Schema.Types.ObjectId, ref: 'Hotel', required: true },
    totalXp: { type: Number, default: 0 },
    totalCoins: { type: Number, default: 0 },
    totalStars: { type: Number, default: 0 },
    level: { type: Number, default: 1 },
    xpToNextLevel: { type: Number, default: 500 },
    currentStreak: { type: Number, default: 0 },
    longestStreak: { type: Number, default: 0 },
    lastAttendanceDate: { type: String, default: '' },
    badges: [BadgeSchema],
    monthlyXp: { type: Number, default: 0 },
    monthlyCoins: { type: Number, default: 0 },
    currentMonth: { type: Number, default: new Date().getMonth() + 1 },
    currentYear: { type: Number, default: new Date().getFullYear() },
    availableCoins: { type: Number, default: 0 },
    redeemedCoins: { type: Number, default: 0 },
  },
  { timestamps: true }
);

GamificationProfileSchema.index({ hotel: 1, totalXp: -1 });
GamificationProfileSchema.index({ hotel: 1, monthlyXp: -1 });

export const GamificationProfile =
  models.GamificationProfile ||
  model<IGamificationProfile>('GamificationProfile', GamificationProfileSchema);

// ─────────────────────────────────────────────
//  Reward Redemption
// ─────────────────────────────────────────────
export type RewardType = 'GIFT_CARD' | 'EXTRA_LEAVE' | 'MERCHANDISE' | 'CASH_EQUIVALENT' | 'EXPERIENCE';
export type RedemptionStatus = 'Pending' | 'Approved' | 'Rejected' | 'Fulfilled';

export interface IRewardRedemption extends Document {
  employee: Schema.Types.ObjectId;
  hotel: Schema.Types.ObjectId;
  rewardType: RewardType;
  rewardTitle: string;
  coinsSpent: number;
  status: RedemptionStatus;
  notes?: string;
  approvedBy?: Schema.Types.ObjectId;
  approvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const RewardRedemptionSchema = new Schema<IRewardRedemption>(
  {
    employee: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    hotel: { type: Schema.Types.ObjectId, ref: 'Hotel', required: true },
    rewardType: {
      type: String,
      enum: ['GIFT_CARD', 'EXTRA_LEAVE', 'MERCHANDISE', 'CASH_EQUIVALENT', 'EXPERIENCE'],
      required: true,
    },
    rewardTitle: { type: String, required: true },
    coinsSpent: { type: Number, required: true },
    status: {
      type: String,
      enum: ['Pending', 'Approved', 'Rejected', 'Fulfilled'],
      default: 'Pending',
    },
    notes: { type: String },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date },
  },
  { timestamps: true }
);

RewardRedemptionSchema.index({ hotel: 1, status: 1 });
RewardRedemptionSchema.index({ employee: 1, createdAt: -1 });

export const RewardRedemption =
  models.RewardRedemption ||
  model<IRewardRedemption>('RewardRedemption', RewardRedemptionSchema);
