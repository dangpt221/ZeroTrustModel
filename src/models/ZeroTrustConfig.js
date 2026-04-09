import mongoose from 'mongoose';

const ZeroTrustConfigSchema = new mongoose.Schema(
  {
    mfaRequired: { type: Boolean, default: true },
    mfaRequiredForAdmins: { type: Boolean, default: true },
    maxLoginFails: { type: Number, default: 5 },
    trustScoreThreshold: { type: Number, default: 70 },
    allowExternalIP: { type: Boolean, default: false },
    alertOnNewDevice: { type: Boolean, default: true },
    ipWhitelist: { type: [String], default: ['192.168.1.0/24', '10.0.0.1', '127.0.0.1', '::1'] },
    geoBlockingEnabled: { type: Boolean, default: false },
    allowedCountries: { type: [String], default: ['VN'] },
    deviceTrustThreshold: { type: Number, default: 80 },
    geofencingEnabled: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export const ZeroTrustConfig = mongoose.model(
  'ZeroTrustConfig',
  ZeroTrustConfigSchema,
);

