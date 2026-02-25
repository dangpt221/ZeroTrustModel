import mongoose from 'mongoose';

const ProjectSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
    status: {
      type: String,
      enum: ['PLANNING', 'IN_PROGRESS', 'COMPLETED'],
      default: 'PLANNING',
    },
  },
  { timestamps: true },
);

export const Project = mongoose.model('Project', ProjectSchema);

