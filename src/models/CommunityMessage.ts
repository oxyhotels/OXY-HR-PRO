import { Schema, model, models, Document } from 'mongoose';

export interface IAttachment {
  fileUrl: string;
  name: string;
  fileType: 'image' | 'video' | 'audio' | 'document';
  fileSize?: number;
}

export interface IReaction {
  user: Schema.Types.ObjectId;
  emoji: string;
}

export interface ISeenInfo {
  user: Schema.Types.ObjectId;
  seenAt: Date;
}

export interface IDeliveredInfo {
  user: Schema.Types.ObjectId;
  deliveredAt: Date;
}

export interface IPollOption {
  optionText: string;
  votes: Schema.Types.ObjectId[]; // Array of User IDs
}

export interface IPoll {
  question: string;
  options: IPollOption[];
  isClosed: boolean;
}

export interface IEventInfo {
  title: string;
  type: 'Meeting' | 'Webinar' | 'Training';
  date: Date;
  time: string;
  reminderMinutes: number;
  participants: Schema.Types.ObjectId[];
}

export interface IVoiceNote {
  audioUrl: string;
  duration: number; // in seconds
  waveform: number[]; // voice waveform amplitude values
}

export interface IVideoMessage {
  videoUrl: string;
  duration: number;
}

export interface IAppreciation {
  type: 'EmployeeOfMonth' | 'StarPerformer' | 'ElitePerformer' | 'TopSales' | 'BestHousekeeping' | 'Other';
  recipient: Schema.Types.ObjectId;
  badge?: string;
  details?: string;
}

export interface ICommunityMessage extends Document {
  group: Schema.Types.ObjectId;
  sender: Schema.Types.ObjectId;
  content?: string;
  reactions: IReaction[];
  seenBy: ISeenInfo[];
  deliveredTo: IDeliveredInfo[];
  attachments: IAttachment[];
  parentMessage?: Schema.Types.ObjectId; // For replies
  forwardedFrom?: Schema.Types.ObjectId; // For forwards
  isPinned: boolean;
  isStarredBy: Schema.Types.ObjectId[];
  isEdited: boolean;
  isDeleted: boolean;
  poll?: IPoll;
  event?: IEventInfo;
  voiceNote?: IVoiceNote;
  videoMessage?: IVideoMessage;
  appreciation?: IAppreciation;
  createdAt: Date;
  updatedAt: Date;
}

const AttachmentSchema = new Schema<IAttachment>({
  fileUrl: { type: String, required: true },
  name: { type: String, required: true },
  fileType: { type: String, enum: ['image', 'video', 'audio', 'document'], required: true },
  fileSize: { type: Number }
}, { _id: false });

const ReactionSchema = new Schema<IReaction>({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  emoji: { type: String, required: true }
}, { _id: false });

const SeenInfoSchema = new Schema<ISeenInfo>({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  seenAt: { type: Date, default: Date.now }
}, { _id: false });

const DeliveredInfoSchema = new Schema<IDeliveredInfo>({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  deliveredAt: { type: Date, default: Date.now }
}, { _id: false });

const PollOptionSchema = new Schema<IPollOption>({
  optionText: { type: String, required: true },
  votes: [{ type: Schema.Types.ObjectId, ref: 'User' }]
}, { _id: false });

const PollSchema = new Schema<IPoll>({
  question: { type: String, required: true },
  options: [PollOptionSchema],
  isClosed: { type: Boolean, default: false }
}, { _id: false });

const EventInfoSchema = new Schema<IEventInfo>({
  title: { type: String, required: true },
  type: { type: String, enum: ['Meeting', 'Webinar', 'Training'], required: true },
  date: { type: Date, required: true },
  time: { type: String, required: true },
  reminderMinutes: { type: Number, default: 15 },
  participants: [{ type: Schema.Types.ObjectId, ref: 'User' }]
}, { _id: false });

const VoiceNoteSchema = new Schema<IVoiceNote>({
  audioUrl: { type: String, required: true },
  duration: { type: Number, required: true },
  waveform: [{ type: Number }]
}, { _id: false });

const VideoMessageSchema = new Schema<IVideoMessage>({
  videoUrl: { type: String, required: true },
  duration: { type: Number, required: true }
}, { _id: false });

const AppreciationSchema = new Schema<IAppreciation>({
  type: { 
    type: String, 
    enum: ['EmployeeOfMonth', 'StarPerformer', 'ElitePerformer', 'TopSales', 'BestHousekeeping', 'Other'], 
    required: true 
  },
  recipient: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  badge: { type: String },
  details: { type: String }
}, { _id: false });

const CommunityMessageSchema = new Schema<ICommunityMessage>(
  {
    group: { type: Schema.Types.ObjectId, ref: 'CommunityGroup', required: true },
    sender: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, trim: true },
    reactions: [ReactionSchema],
    seenBy: [SeenInfoSchema],
    deliveredTo: [DeliveredInfoSchema],
    attachments: [AttachmentSchema],
    parentMessage: { type: Schema.Types.ObjectId, ref: 'CommunityMessage' },
    forwardedFrom: { type: Schema.Types.ObjectId, ref: 'CommunityMessage' },
    isPinned: { type: Boolean, default: false },
    isStarredBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    isEdited: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },
    poll: PollSchema,
    event: EventInfoSchema,
    voiceNote: VoiceNoteSchema,
    videoMessage: VideoMessageSchema,
    appreciation: AppreciationSchema
  },
  { timestamps: true }
);

CommunityMessageSchema.index({ group: 1, createdAt: -1 });
CommunityMessageSchema.index({ sender: 1 });

export const CommunityMessage = models.CommunityMessage || model<ICommunityMessage>('CommunityMessage', CommunityMessageSchema);
