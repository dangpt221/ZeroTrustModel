import mongoose from 'mongoose';

const AuditLogSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    action: { type: String, required: true },
    resource: { type: String },
    ip: { type: String },
    device: { type: String },
    metadata: { type: Object },
  },
  { timestamps: true },
);

export const AuditLog = mongoose.model('AuditLog', AuditLogSchema);

