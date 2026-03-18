import mongoose from 'mongoose';

const ChatRoomSchema = new mongoose.Schema({
  // Room identification
  name: { type: String, required: true },
  description: { type: String, default: '' },

  // Room type
  type: {
    type: String,
    enum: ['PRIVATE', 'GROUP', 'DEPARTMENT', 'PROJECT'],
    default: 'GROUP'
  },

  // Room settings
  isPrivate: { type: Boolean, default: false },
  isSystemRoom: { type: Boolean, default: false }, // System announcements room

  // Ownership and management
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },

  // Members
  members: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    role: { type: String, enum: ['OWNER', 'ADMIN', 'MEMBER'], default: 'MEMBER' },
    joinedAt: { type: Date, default: Date.now },
    leftAt: { type: Date }
  }],
  memberCount: { type: Number, default: 0 },

  // For 1-on-1 chats - store participant IDs directly for quick lookup
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  participantNames: [{ type: String }], // Cache for display
  
  // 1-on-1 chat metadata
  isDirectMessage: { type: Boolean, default: false },
  relatedUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // The other user in DM

  // Room status
  isLocked: { type: Boolean, default: false },
  lockedAt: { type: Date },
  lockedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  lockReason: { type: String, default: '' },

  // Settings
  allowFileUpload: { type: Boolean, default: true },
  maxFileSize: { type: Number, default: 10 * 1024 * 1024 }, // 10MB default
  allowedFileTypes: [{ type: String }],
  requireApproval: { type: Boolean, default: false }, // Messages need approval

  // Message settings
  autoDeleteDays: { type: Number, default: 0 }, // 0 = never auto-delete
  maxMessageLength: { type: Number, default: 5000 },

  // Metadata
  lastMessageAt: { type: Date },
  lastActivityAt: { type: Date },
  messageCount: { type: Number, default: 0 },

  // Soft delete
  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date }
}, { timestamps: true });

// Indexes
ChatRoomSchema.index({ name: 'text', description: 'text' });
ChatRoomSchema.index({ type: 1, isLocked: 1 });
ChatRoomSchema.index({ 'members.userId': 1 });
ChatRoomSchema.index({ departmentId: 1 });
ChatRoomSchema.index({ createdBy: 1 });

// New indexes for 1-on-1 chat and conversations
ChatRoomSchema.index({ isDirectMessage: 1, participants: 1 });
ChatRoomSchema.index({ relatedUserId: 1 });
ChatRoomSchema.index({ lastMessageAt: -1 });
export const ChatRoom = mongoose.model('ChatRoom', ChatRoomSchema);
