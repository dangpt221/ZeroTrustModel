import mongoose from 'mongoose';

const ZeroTrustConfigSchema = new mongoose.Schema(
  {
    mfaRequiredForAdmins: { type: Boolean, default: true },
    deviceTrustThreshold: { type: Number, default: 80 },
    geofencingEnabled: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export const ZeroTrustConfig = mongoose.model(
  'ZeroTrustConfig',
  ZeroTrustConfigSchema,
);

