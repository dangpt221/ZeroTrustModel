import mongoose from 'mongoose';

const RoomKeyDistributionSchema = new mongoose.Schema({
  roomId: { type: String, required: true, index: true }, // e.g., the ChatRoom ID
  deviceId: { type: String, required: true, index: true }, // The Device UUID
  encryptedSymmetricKey: { type: String, required: true }, // The room's AES key encrypted via the device's public key
}, { timestamps: true });

// A device should only have one copy of the symmetric key per room
RoomKeyDistributionSchema.index({ roomId: 1, deviceId: 1 }, { unique: true });

export const RoomKeyDistribution = mongoose.model('RoomKeyDistribution', RoomKeyDistributionSchema);
