import mongoose from 'mongoose';

const MessageSchema = new mongoose.Schema(
  {
    // Sender info
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    userName: { type: String, required: true },

    // Message content
    text: { type: String, required: true },
    attachments: [{
      url: String,
      fileName: String,
      fileType: String,
      fileSize: Number
    }],

    // Room/Channel info
    roomId: { type: mongoose.Schema.Types.ObjectId, ref: 'ChatRoom' },
    room: { type: String, default: 'general' },

    // Message status
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date },
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    deletionReason: { type: String, default: '' },
    isHidden: { type: Boolean, default: false }, // Hidden from users but kept for audit
    isSystemMessage: { type: Boolean, default: false }, // System announcements

    // Message metadata
    editedAt: { type: Date },
    isEdited: { type: Boolean, default: false },

    // Threading - Reply to specific message
    parentMessageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Message' },
    replyCount: { type: Number, default: 0 },

    // Read receipts
    readBy: [{
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      readAt: { type: Date, default: Date.now }
    }],

    // File attachments (enhanced)
    hasAttachments: { type: Boolean, default: false },

    // Reactions (for future use)
    reactions: [{
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      emoji: String,
      createdAt: { type: Date, default: Date.now }
    }],

    // Audit
    ipAddress: { type: String },
    userAgent: { type: String }
  },
  { timestamps: true }
);

// Indexes for performance
MessageSchema.index({ room: 1, createdAt: -1 });
MessageSchema.index({ userId: 1, createdAt: -1 });
MessageSchema.index({ text: 'text' }); // Full-text search
MessageSchema.index({ isDeleted: 1 });

// New indexes for new features
MessageSchema.index({ parentMessageId: 1, createdAt: 1 }); // Threading
MessageSchema.index({ 'readBy.userId': 1, createdAt: 1 }); // Read receipts
export const Message = mongoose.model('Message', MessageSchema);

