import mongoose from 'mongoose';

const websiteBudgetSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    category: { type: String, default: 'General' },
    allocated: { type: Number, required: true, min: 0 },
    spent: { type: Number, default: 0, min: 0 },
    period: { type: String, default: '' },
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

const websiteProjectSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    slug: { type: String, unique: true, required: true },
    description: { type: String, default: '' },
    coverImage: { type: String, default: '' },
    gallery: [{ type: String }],
    linkedProject: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
    status: { type: String, enum: ['draft', 'published', 'archived'], default: 'draft' },
    featured: { type: Boolean, default: false },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const WebsiteBudget = mongoose.model('WebsiteBudget', websiteBudgetSchema);
export const WebsiteProject = mongoose.model('WebsiteProject', websiteProjectSchema);
