import { Schema, model, models, Document } from 'mongoose';


export interface IKnowledgeItem extends Document {
  title: string;
  content: string; // Markdown supported
  author: Schema.Types.ObjectId;
  hotel: Schema.Types.ObjectId; // Multi-tenancy partition
  department?: string; // Optional department restriction
  attachments: {
    name: string;
    fileUrl: string;
  }[];
  category: 'SOP' | 'Training' | 'Tip' | 'Document';
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

const KnowledgeItemSchema = new Schema<IKnowledgeItem>(
  {
    title: { type: String, required: true, trim: true },
    content: { type: String, required: true },
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    hotel: { type: Schema.Types.ObjectId, ref: 'Hotel', required: true },
    department: { type: String, trim: true },
    attachments: [
      {
        name: { type: String, required: true },
        fileUrl: { type: String, required: true }
      }
    ],
    category: { type: String, enum: ['SOP', 'Training', 'Tip', 'Document'], default: 'Document' },
    tags: [{ type: String, trim: true }]
  },
  { timestamps: true }
);

KnowledgeItemSchema.index({ hotel: 1, category: 1 });
KnowledgeItemSchema.index({ title: 'text', content: 'text', tags: 'text' }); // Text search index

export const KnowledgeItem = models.KnowledgeItem || model<IKnowledgeItem>('KnowledgeItem', KnowledgeItemSchema);
