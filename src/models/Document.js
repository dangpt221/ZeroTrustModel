import mongoose from 'mongoose';

const DocumentSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, default: '' },
    departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
    classification: {
      type: String,
      enum: ['PUBLIC', 'INTERNAL', 'CONFIDENTIAL'],
      default: 'INTERNAL',
    },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    tags: [{ type: String }],
    fileSize: { type: String, default: '' },
    fileType: { type: String, default: 'PDF' },
    url: { type: String, default: '' },
    sensitivity: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
      default: 'LOW',
    },
  },
  { timestamps: true },
);

export const Document = mongoose.model('Document', DocumentSchema);

