import mongoose from 'mongoose';

const AuditLogSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    userName: { type: String }, // Store name at log time for easy access
    action: { type: String, required: true },
    resource: { type: String },
    details: { type: String, default: '' },
    ip: { type: String },
    device: { type: String },
    status: { type: String, enum: ['SUCCESS', 'FAILED', 'WARNING'], default: 'SUCCESS' },
    riskLevel: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], default: 'LOW' },
    metadata: { type: Object },
  },
  { timestamps: true },
);

export const AuditLog = mongoose.model('AuditLog', AuditLogSchema);

