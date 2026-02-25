import mongoose from 'mongoose';

const RoleSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    description: { type: String },
    permissions: [{ type: String }],
  },
  { timestamps: true },
);

export const Role = mongoose.model('Role', RoleSchema);

