import mongoose from 'mongoose';

const DocumentVersionSchema = new mongoose.Schema({
  version: { type: Number, required: true },
  url: { type: String, required: true },
  fileSize: { type: String },
  fileType: { type: String },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  uploadedAt: { type: Date, default: Date.now },
  changes: { type: String, default: '' },
  encryptionMetadata: {
    dataKey: { type: String, default: null },
    iv: { type: String, default: null },
    authTag: { type: String, default: null },
    fileHash: { type: String, default: null }
  }
});

const DocumentSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, default: '' },
    departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    // Classification & Security
    classification: {
      type: String,
      enum: ['PUBLIC', 'INTERNAL', 'CONFIDENTIAL'],
      default: 'INTERNAL',
    },
    securityLevel: {
      type: Number,
      enum: [1, 2, 3],
      default: 1 // 1=LOW, 2=MEDIUM, 3=HIGH
    },
    sensitivity: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
      default: 'LOW',
    },

    // Password protection for sensitive documents
    password: { type: String, default: null },
    isPasswordProtected: { type: Boolean, default: false },
    isLocked: { type: Boolean, default: false }, // Admin can lock document
    lockedAt: { type: Date },
    lockedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    // Track failed password attempts
    failedAttempts: { type: Number, default: 0 },
    lockedUntil: { type: Date, default: null }, // Locked permanently after 3 failed attempts

    // File info
    currentVersion: { type: Number, default: 1 },
    versions: [DocumentVersionSchema],
    fileSize: { type: String, default: '' },
    fileType: { type: String, default: 'PDF' },
    url: { type: String, default: '' },

    // Envelope Encryption Metadata
    encryptionMetadata: {
      dataKey: { type: String, default: null }, // Encrypted Data Key
      iv: { type: String, default: null },
      authTag: { type: String, default: null }, // AES-GCM Auth Tag
      fileHash: { type: String, default: null } // SHA-256 for Integrity Check
    },

    // Status & Workflow
    status: {
      type: String,
      enum: ['DRAFT', 'PENDING', 'APPROVED', 'REJECTED'],
      default: 'DRAFT'
    },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date },
    rejectionReason: { type: String, default: '' },

    // Tags
    tags: [{ type: String }],

    // Soft delete
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date },

    // Audit trail
    viewedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    downloadedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    lastViewedAt: { type: Date },
    lastDownloadedAt: { type: Date },
  },
  { timestamps: true }
);

// Index for searching
DocumentSchema.index({ title: 'text', description: 'text', tags: 'text' });
DocumentSchema.index({ departmentId: 1, status: 1 });
DocumentSchema.index({ ownerId: 1 });

export const Document = mongoose.model('Document', DocumentSchema);

