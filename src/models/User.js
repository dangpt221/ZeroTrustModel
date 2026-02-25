import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, index: true },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      enum: ['ADMIN', 'MANAGER', 'STAFF'],
      default: 'STAFF',
    },
    departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
    isLocked: { type: Boolean, default: false },
    mfaEnabled: { type: Boolean, default: false },
    trustScore: { type: Number, default: 95 },
  },
  { timestamps: true },
);

export const User = mongoose.model('User', UserSchema);

