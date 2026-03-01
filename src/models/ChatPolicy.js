import mongoose from 'mongoose';

const ChatPolicySchema = new mongoose.Schema({
  // Policy name
  name: { type: String, required: true, unique: true },
  description: { type: String, default: '' },

  // Message retention policy
  messageRetention: {
    enabled: { type: Boolean, default: true },
    days: { type: Number, default: 90 }, // Keep messages for 90 days
    autoDelete: { type: Boolean, default: true }
  },

  // File upload settings
  fileUpload: {
    enabled: { type: Boolean, default: true },
    maxFileSize: { type: Number, default: 10 * 1024 * 1024 }, // 10MB
    allowedTypes: [{ type: String, enum: ['PDF', 'DOC', 'DOCX', 'XLS', 'XLSX', 'PPT', 'PPTX', 'TXT', 'PNG', 'JPG', 'JPEG', 'GIF', 'ZIP', 'RAR'] }],
    maxFilesPerMessage: { type: Number, default: 5 }
  },

  // User restrictions
  restrictions: {
    maxMessageLength: { type: Number, default: 5000 },
    maxMessagesPerMinute: { type: Number, default: 10 },
    maxMessagesPerDay: { type: Number, default: 500 },
    blockExternalLinks: { type: Boolean, default: false },
    blockAdultContent: { type: Boolean, default: true }
  },

  // Moderation settings
  moderation: {
    enableAutoModeration: { type: Boolean, default: false },
    flaggedKeywords: [{ type: String }],
    requireApprovalForNewUsers: { type: Boolean, default: false }
  },

  // Audit settings
  audit: {
    logAllMessages: { type: Boolean, default: true },
    logFileUploads: { type: Boolean, default: true },
    exportRetentionDays: { type: Number, default: 365 }
  },

  // Status
  isActive: { type: Boolean, default: true },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

export const ChatPolicy = mongoose.model('ChatPolicy', ChatPolicySchema);
