import { Schema, model, models, Document } from 'mongoose';

export interface IHierarchyNode extends Document {
  userId: Schema.Types.ObjectId;
  parentId?: Schema.Types.ObjectId; // User ID of parent reporting manager
  departmentId: Schema.Types.ObjectId;
  organizationId: Schema.Types.ObjectId;
  role: string;
  hierarchyLevel?: number;
  hierarchyPath?: string;
  createdAt: Date;
  updatedAt: Date;
}

const HierarchyNodeSchema = new Schema<IHierarchyNode>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    parentId: { type: Schema.Types.ObjectId, ref: 'User' },
    departmentId: { type: Schema.Types.ObjectId, ref: 'Department', required: true },
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    role: { type: String, required: true },
    hierarchyLevel: { type: Number },
    hierarchyPath: { type: String },
  },
  { timestamps: true }
);

HierarchyNodeSchema.index({ organizationId: 1, departmentId: 1 });
HierarchyNodeSchema.index({ parentId: 1 });

export const HierarchyNode = models.HierarchyNode || model<IHierarchyNode>('HierarchyNode', HierarchyNodeSchema);
