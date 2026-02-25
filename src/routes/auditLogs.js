import { requireAuth, requireRole } from '../middleware/auth.js';
import { AuditLog } from '../models/AuditLog.js';

export function registerAuditLogRoutes(router) {
  router.get('/audit-logs', requireAuth, requireRole(['ADMIN']), async (_req, res, next) => {
    try {
      const logs = await AuditLog.find().sort({ createdAt: -1 }).lean();
      res.json(
        logs.map((l) => ({
          id: l._id.toString(),
          userId: l.userId,
          action: l.action,
          resource: l.resource,
          ip: l.ip,
          device: l.device,
          timestamp: l.createdAt,
        })),
      );
    } catch (err) {
      next(err);
    }
  });
}

