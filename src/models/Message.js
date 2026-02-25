import mongoose from 'mongoose';

const MessageSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    userName: { type: String, required: true },
    text: { type: String, required: true },
    room: { type: String, default: 'general' },
  },
  { timestamps: true },
);

export const Message = mongoose.model('Message', MessageSchema);

