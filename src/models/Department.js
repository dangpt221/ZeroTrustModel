import mongoose from 'mongoose';

const DepartmentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String },
    managerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
    isActive: { type: Boolean, default: true },
    color: { type: String, default: '#3B82F6' },
    code: { type: String, unique: true, sparse: true }, // Mã bộ phận (e.g., IT, HR, Marketing)
  },
  { timestamps: true },
);

// Index for faster queries
DepartmentSchema.index({ name: 1 });
DepartmentSchema.index({ isActive: 1 });

export const Department = mongoose.model('Department', DepartmentSchema);

