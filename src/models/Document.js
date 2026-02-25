import mongoose from 'mongoose';

const DocumentSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
    classification: {
      type: String,
      enum: ['PUBLIC', 'INTERNAL', 'CONFIDENTIAL'],
      default: 'INTERNAL',
    },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    tags: [{ type: String }],
  },
  { timestamps: true },
);

export const Document = mongoose.model('Document', DocumentSchema);

