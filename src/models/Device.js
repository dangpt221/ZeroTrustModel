import mongoose from 'mongoose';

const DeviceSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  deviceId: { type: String, required: true, unique: true }, // Client UUID or similar unique identifier
  deviceName: { type: String, default: 'Unknown Device' }, // Client Info (e.g. Browser or App OS)
  ipAddress: { type: String }, // IP nhận diện nơi đăng nhập
  userAgent: { type: String }, // Metadata gốc của môi trường
  publicKey: { type: String, required: true }, // E2EE Public Key (e.g. Base64 ECDH)
  signaturePublicKey: { type: String }, // Khóa phụ ECDSA chuyên dụng cho xác thực
  isActive: { type: Boolean, default: true },
  lastActiveAt: { type: Date, default: Date.now }
}, { timestamps: true });

export const Device = mongoose.model('Device', DeviceSchema);
