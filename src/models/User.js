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
    customRoles: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Role' }],
    googleId: { type: String, unique: true, sparse: true },
    hasPasswordSet: { type: Boolean, default: true },
    avatar: { type: String },
    departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
    isLocked: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ['ACTIVE', 'LOCKED', 'PENDING'],
      default: 'PENDING',
    },
    mfaEnabled: { type: Boolean, default: false },
    trustScore: { type: Number, default: 95 },
    knownDevices: [{ type: String }], // Store device fingerprints
    device: { type: String, default: '' }, // e.g. "Điện thoại (Chrome)" or "Máy tính (Chrome)"
    lastActiveAt: { type: Date, default: null }, // For online/offline status

    // E2EE Key Backup (Recovery Password System)
    hasE2EEBackup: { type: Boolean, default: false },
    encryptedMasterKey: { type: String, default: null },
    masterKeySalt: { type: String, default: null },
    masterKeyIv: { type: String, default: null },
  },
  { timestamps: true },
);

export const User = mongoose.model('User', UserSchema);

