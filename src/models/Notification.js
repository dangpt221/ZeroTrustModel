import mongoose from 'mongoose';

const NotificationSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    required: true 
  },
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: { 
    type: String, 
    enum: ['INFO', 'WARNING', 'ALERT', 'SUCCESS'],
    default: 'INFO' 
  },
  isRead: { type: Boolean, default: false },
  priority: { type: String, enum: ['LOW', 'NORMAL', 'HIGH'], default: 'NORMAL' }
}, { timestamps: true });

export const Notification = mongoose.model('Notification', NotificationSchema);

