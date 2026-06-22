import { Schema, model, models, Document } from 'mongoose';
import { DEPARTMENTS } from '@/constants/departments';

export type GroupType = 
  | 'GlobalGroup' 
  | 'PublicGroup' 
  | 'PrivateGroup' 
  | 'DepartmentGroup' 
  | 'HotelGroup' 
  | 'ProjectGroup' 
  | 'AnnouncementChannel'
  | 'TeamGroup'
  | 'CustomGroup';

export interface IGroupMember {
  user: Schema.Types.ObjectId;
  role: 'admin' | 'moderator' | 'member';
  joinedAt: Date;
}

export interface ICommunityGroup extends Document {
  name: string;
  type: GroupType;
  description?: string;
  groupIcon?: string;
  autoSyncDept?: boolean;
  hotel?: Schema.Types.ObjectId; // Empty for Root Admin global group, required for hotel tenants
  department?: string; // e.g. "Housekeeping"
  createdBy?: Schema.Types.ObjectId;
  members: IGroupMember[];
  pinMessages: Schema.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const GroupMemberSchema = new Schema<IGroupMember>({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  role: { type: String, enum: ['admin', 'moderator', 'member'], default: 'member' },
  joinedAt: { type: Date, default: Date.now }
}, { _id: false });

const CommunityGroupSchema = new Schema<ICommunityGroup>(
  {
    name: { type: String, required: true, trim: true },
    type: { 
      type: String, 
      enum: [
        'GlobalGroup', 
        'PublicGroup', 
        'PrivateGroup', 
        'DepartmentGroup', 
        'HotelGroup', 
        'ProjectGroup', 
        'AnnouncementChannel',
        'TeamGroup',
        'CustomGroup'
      ], 
      required: true 
    },
    description: { type: String, trim: true },
    groupIcon: { type: String, trim: true },
    autoSyncDept: { type: Boolean, default: false },
    hotel: { type: Schema.Types.ObjectId, ref: 'Hotel' },
    department: { type: String, trim: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    members: [GroupMemberSchema],
    pinMessages: [{ type: Schema.Types.ObjectId, ref: 'CommunityMessage' }]
  },
  { timestamps: true }
);

CommunityGroupSchema.index({ hotel: 1 });
CommunityGroupSchema.index({ 'members.user': 1 });

export const CommunityGroup = models.CommunityGroup || model<ICommunityGroup>('CommunityGroup', CommunityGroupSchema);
