import { requireAuth, requireRole } from '../middleware/auth.js';
import { Document } from '../models/Document.js';
import { DocumentRequest } from '../models/DocumentRequest.js';

export function registerDocumentRoutes(router) {
  // ============= DOCUMENTS API =============

  // Get all documents
  router.get('/documents', requireAuth, async (_req, res, next) => {
    try {
      const docs = await Document.find().lean();
      res.json(
        docs.map((d) => ({
          id: d._id.toString(),
          title: d.title,
          description: d.description,
          classification: d.classification,
          departmentId: d.departmentId,
          ownerId: d.ownerId,
          tags: d.tags || [],
          fileSize: d.fileSize,
          fileType: d.fileType,
          url: d.url,
          sensitivity: d.sensitivity,
          createdAt: d.createdAt,
          updatedAt: d.updatedAt,
        })),
      );
    } catch (err) {
      next(err);
    }
  });

  // Get single document
  router.get('/documents/:id', requireAuth, async (req, res, next) => {
    try {
      const { id } = req.params;
      const doc = await Document.findById(id).lean();
      if (!doc) return res.status(404).json({ message: 'Document not found' });
      res.json({
        id: doc._id.toString(),
        title: doc.title,
        description: doc.description,
        classification: doc.classification,
        departmentId: doc.departmentId,
        ownerId: doc.ownerId,
        tags: doc.tags || [],
        fileSize: doc.fileSize,
        fileType: doc.fileType,
        url: doc.url,
        sensitivity: doc.sensitivity,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
      });
    } catch (err) {
      next(err);
    }
  });

  // Create new document
  router.post('/documents', requireAuth, async (req, res, next) => {
    try {
      const { 
        title, description, classification, departmentId, 
        tags, fileSize, fileType, url, sensitivity 
      } = req.body;
      
      const doc = await Document.create({
        title,
        description,
        classification,
        departmentId,
        ownerId: req.user.id,
        tags: tags || [],
        fileSize,
        fileType,
        url,
        sensitivity: sensitivity || 'LOW',
      });
      
      res.status(201).json({ 
        id: doc._id.toString(),
        message: 'Document created successfully' 
      });
    } catch (err) {
      next(err);
    }
  });

  // Update document
  router.put('/documents/:id', requireAuth, async (req, res, next) => {
    try {
      const { id } = req.params;
      const { title, description, classification, tags, sensitivity } = req.body;
      
      const update = {};
      if (title) update.title = title;
      if (description !== undefined) update.description = description;
      if (classification) update.classification = classification;
      if (tags) update.tags = tags;
      if (sensitivity) update.sensitivity = sensitivity;

      const doc = await Document.findByIdAndUpdate(id, update, { new: true });
      if (!doc) return res.status(404).json({ message: 'Document not found' });
      
      res.json({ id: doc._id.toString() });
    } catch (err) {
      next(err);
    }
  });

  // Delete document
  router.delete('/documents/:id', requireAuth, requireRole(['ADMIN']), async (req, res, next) => {
    try {
      const { id } = req.params;
      await Document.findByIdAndDelete(id);
      res.json({ success: true, message: 'Document deleted' });
    } catch (err) {
      next(err);
    }
  });

  // ============= DOCUMENT REQUESTS API =============

  // Get all document requests
  router.get('/document-requests', requireAuth, async (_req, res, next) => {
    try {
      const reqs = await DocumentRequest.find()
        .sort({ createdAt: -1 })
        .lean();
      res.json(
        reqs.map((r) => ({
          id: r._id.toString(),
          documentId: r.documentId,
          userId: r.userId,
          reason: r.reason,
          status: r.status,
          reviewedBy: r.reviewedBy,
          reviewedAt: r.reviewedAt,
          createdAt: r.createdAt,
        })),
      );
    } catch (err) {
      next(err);
    }
  });

  // Get my document requests
  router.get('/document-requests/my', requireAuth, async (req, res, next) => {
    try {
      const requests = await DocumentRequest.find({ userId: req.user.id })
        .sort({ createdAt: -1 })
        .lean();
      res.json(requests.map((r) => ({
        id: r._id.toString(),
        documentId: r.documentId,
        reason: r.reason,
        status: r.status,
        createdAt: r.createdAt,
      })));
    } catch (err) {
      next(err);
    }
  });

  // Create document access request
  router.post('/document-requests', requireAuth, async (req, res, next) => {
    try {
      const { documentId, reason } = req.body;
      
      // Check if document exists
      const doc = await Document.findById(documentId);
      if (!doc) return res.status(404).json({ message: 'Document not found' });
      
      const request = await DocumentRequest.create({
        documentId,
        reason,
        userId: req.user.id,
        status: 'PENDING',
      });
      
      res.status(201).json({ 
        id: request._id.toString(),
        message: 'Request submitted successfully' 
      });
    } catch (err) {
      next(err);
    }
  });

  // Approve/Reject document request
  router.put('/document-requests/:id', requireAuth, requireRole(['ADMIN', 'MANAGER']), async (req, res, next) => {
    try {
      const { id } = req.params;
      const { status } = req.body; // APPROVED or REJECTED
      
      if (!['APPROVED', 'REJECTED'].includes(status)) {
        return res.status(400).json({ message: 'Invalid status' });
      }
      
      const request = await DocumentRequest.findByIdAndUpdate(
        id,
        { 
          status,
          reviewedBy: req.user.id,
          reviewedAt: new Date()
        },
        { new: true }
      );
      
      if (!request) return res.status(404).json({ message: 'Request not found' });
      
      res.json({ 
        id: request._id.toString(),
        status: request.status 
      });
    } catch (err) {
      next(err);
    }
  });
}
