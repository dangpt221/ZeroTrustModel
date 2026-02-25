import { requireAuth } from '../middleware/auth.js';
import { Document } from '../models/Document.js';
import { DocumentRequest } from '../models/DocumentRequest.js';

export function registerDocumentRoutes(router) {
  router.get('/documents', requireAuth, async (_req, res, next) => {
    try {
      const docs = await Document.find().lean();
      res.json(
        docs.map((d) => ({
          id: d._id.toString(),
          title: d.title,
          classification: d.classification,
          departmentId: d.departmentId,
          ownerId: d.ownerId,
          tags: d.tags || [],
        })),
      );
    } catch (err) {
      next(err);
    }
  });

  router.post('/documents', requireAuth, async (req, res, next) => {
    try {
      const { title, classification, departmentId, ownerId, tags } = req.body;
      const doc = await Document.create({
        title,
        classification,
        departmentId,
        ownerId,
        tags,
      });
      res.status(201).json({ id: doc._id.toString() });
    } catch (err) {
      next(err);
    }
  });

  router.delete('/documents/:id', requireAuth, async (req, res, next) => {
    try {
      const { id } = req.params;
      await Document.findByIdAndDelete(id);
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  });

  // Access requests
  router.get('/document-requests', requireAuth, async (_req, res, next) => {
    try {
      const reqs = await DocumentRequest.find().lean();
      res.json(
        reqs.map((r) => ({
          id: r._id.toString(),
          documentId: r.documentId,
          userId: r.userId,
          reason: r.reason,
          status: r.status,
        })),
      );
    } catch (err) {
      next(err);
    }
  });

  router.post('/document-requests', requireAuth, async (req, res, next) => {
    try {
      const { documentId, reason } = req.body;
      const userId = req.user?.id;
      const request = await DocumentRequest.create({
        documentId,
        reason,
        userId,
      });
      res.status(201).json({ id: request._id.toString() });
    } catch (err) {
      next(err);
    }
  });

  router.put('/document-requests/:id', requireAuth, async (req, res, next) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const r = await DocumentRequest.findByIdAndUpdate(
        id,
        { status },
        { new: true },
      );
      res.json({ id: r._id.toString(), status: r.status });
    } catch (err) {
      next(err);
    }
  });
}

