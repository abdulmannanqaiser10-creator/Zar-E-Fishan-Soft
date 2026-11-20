import mongoose from 'mongoose';

const taskSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, default: '' },
    status: {
      type: String,
      enum: ['todo', 'in_progress', 'done'],
      default: 'todo',
    },
    dueDate: { type: Date },
    completedAt: { type: Date },
  },
  { timestamps: true }
);

const projectSchema = new mongoose.Schema(
  {
    projectId: { type: String, unique: true, required: true },
    name: { type: String, required: true, trim: true },
    client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
    description: { type: String, default: '' },
    budget: { type: Number, required: true, min: 0 },
    startDate: { type: Date, required: true },
    endDate: { type: Date },
    status: {
      type: String,
      enum: ['Planning', 'In Progress', 'On Hold', 'Completed'],
      default: 'Planning',
    },
    progress: { type: Number, default: 0, min: 0, max: 100 },
    tasks: [taskSchema],
    totalRevenue: { type: Number, default: 0 },
    totalExpenses: { type: Number, default: 0 },
    location: { type: String, default: '' },
    notes: { type: String, default: '' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

projectSchema.index({ name: 'text', projectId: 'text' });

projectSchema.methods.recalculateProgress = function recalculateProgress() {
  if (!this.tasks?.length) {
    this.progress = this.status === 'Completed' ? 100 : this.progress || 0;
    return this.progress;
  }
  const done = this.tasks.filter((t) => t.status === 'done').length;
  this.progress = Math.round((done / this.tasks.length) * 100);
  return this.progress;
};

export default mongoose.model('Project', projectSchema);
