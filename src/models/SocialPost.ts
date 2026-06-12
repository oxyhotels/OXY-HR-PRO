import { Schema, model, models, Document } from 'mongoose';

export interface ISocialReaction {
  user: Schema.Types.ObjectId;
  type: 'like' | 'celebrate' | 'love' | 'insightful';
}

export interface ISocialComment {
  user: Schema.Types.ObjectId;
  content: string;
  createdAt: Date;
}

export interface ISocialPost extends Document {
  author: Schema.Types.ObjectId;
  hotel: Schema.Types.ObjectId; // Multi-tenancy partition
  content: string;
  mediaUrls: string[];
  mediaType: 'image' | 'video' | 'none';
  reactions: ISocialReaction[];
  comments: ISocialComment[];
  achievement?: {
    title: string;
    badgeUrl?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const SocialReactionSchema = new Schema<ISocialReaction>({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['like', 'celebrate', 'love', 'insightful'], default: 'like' }
}, { _id: false });

const SocialCommentSchema = new Schema<ISocialComment>({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, required: true, trim: true },
  createdAt: { type: Date, default: Date.now }
});

const SocialPostSchema = new Schema<ISocialPost>(
  {
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    hotel: { type: Schema.Types.ObjectId, ref: 'Hotel', required: true },
    content: { type: String, required: true, trim: true },
    mediaUrls: [{ type: String }],
    mediaType: { type: String, enum: ['image', 'video', 'none'], default: 'none' },
    reactions: [SocialReactionSchema],
    comments: [SocialCommentSchema],
    achievement: {
      title: { type: String },
      badgeUrl: { type: String }
    }
  },
  { timestamps: true }
);

SocialPostSchema.index({ hotel: 1, createdAt: -1 });

export const SocialPost = models.SocialPost || model<ISocialPost>('SocialPost', SocialPostSchema);
