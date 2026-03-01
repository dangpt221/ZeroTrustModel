import mongoose from 'mongoose';

const RoleSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    description: { type: String },
    permissions: [{ type: String }],
    color: { type: String, default: 'bg-blue-500' },
    isActive: { type: Boolean, default: true },
    isSystem: { type: Boolean, default: false }, // System roles cannot be deleted
  },
  { timestamps: true },
);

export const Role = mongoose.model('Role', RoleSchema);

