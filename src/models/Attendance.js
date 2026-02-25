import mongoose from 'mongoose';

const AttendanceSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['CHECK_IN', 'CHECK_OUT'], required: true },
    location: { type: String, default: 'Văn phòng Nexus (Hà Nội)' },
    device: { type: String, default: 'MacBook Pro (Authorized)' },
  },
  { timestamps: true },
);

export const Attendance = mongoose.model('Attendance', AttendanceSchema);

