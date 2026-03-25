import mongoose from 'mongoose';

const HoneytokenSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    type: {
      type: String,
      enum: ['DOCUMENT', 'CREDENTIAL', 'API_KEY', 'FILE', 'LINK'],
      default: 'DOCUMENT',
    },
    description: { type: String, default: '' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    // Track if token was triggered
    isTriggered: { type: Boolean, default: false },
    triggeredAt: { type: Date },
    triggeredBy: { type: String }, // IP or user agent
    triggeredByIp: { type: String },
    triggeredByUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    triggerDetails: { type: String, default: '' },

    // Status
    isActive: { type: Boolean, default: true },
    expiresAt: { type: Date },

    // Associated honeypot (fake resource it appears to be)
    fakeDocumentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document' },
    fakeDepartmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },

    // Alert settings
    alertEmail: { type: Boolean, default: true },
    alertWebhook: { type: String },
    alertAdmin: { type: Boolean, default: true },

    // Access logs
    accessLogs: [
      {
        timestamp: { type: Date, default: Date.now },
        ip: { type: String },
        userAgent: { type: String },
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        action: { type: String }, // VIEW, DOWNLOAD, COPY, SHARE
        details: { type: String },
      },
    ],
  },
  { timestamps: true }
);

// Index
HoneytokenSchema.index({ isTriggered: 1, isActive: 1 });
HoneytokenSchema.index({ type: 1 });
HoneytokenSchema.index({ createdBy: 1 });

// Auto-expire
HoneytokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const Honeytoken = mongoose.model('Honeytoken', HoneytokenSchema);
