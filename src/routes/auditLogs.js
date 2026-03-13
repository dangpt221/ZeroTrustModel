import { requireAuth, requireRole } from '../middleware/auth.js';
import { AuditLog } from '../models/AuditLog.js';

export function registerAuditLogRoutes(router) {
  // Get all audit logs (ADMIN only)
  router.get('/audit-logs', requireAuth, requireRole(['ADMIN']), async (_req, res, next) => {
    try {
      const logs = await AuditLog.find()
        .sort({ createdAt: -1 })
        .limit(100)
        .lean();
      res.json(
        logs.map((l) => ({
          id: l._id.toString(),
          userId: l.userId,
          userName: l.userName || 'System',
          action: l.action,
          details: l.details || '',
          ipAddress: l.ip || '127.0.0.1',
          timestamp: l.createdAt,
          status: l.status || 'SUCCESS',
          riskLevel: l.riskLevel || 'LOW',
        })),
      );
    } catch (err) {
      next(err);
    }
  });

  // Get current user's audit logs
  router.get('/audit-logs/me', requireAuth, async (req, res, next) => {
    try {
      const logs = await AuditLog.find({ userId: req.user.id })
        .sort({ createdAt: -1 })
        .limit(50)
        .lean();
      res.json(
        logs.map((l) => ({
          id: l._id.toString(),
          userId: l.userId,
          userName: l.userName || req.user.name,
          action: l.action,
          details: l.details,
          ipAddress: l.ip,
          timestamp: l.createdAt,
          status: l.status,
          riskLevel: l.riskLevel || 'LOW',
        })),
      );
    } catch (err) {
      next(err);
    }
  });

  // Create audit log entry
  router.post('/audit-logs', requireAuth, async (req, res, next) => {
    try {
      const { action, details, status, riskLevel } = req.body;
      
      const log = await AuditLog.create({
        userId: req.user.id,
        userName: req.user.name || req.user.email,
        action,
        details,
        ip: req.ip || '127.0.0.1',
        status: status || 'SUCCESS',
        riskLevel: riskLevel || 'LOW',
      });
      
      res.status(201).json({ id: log._id.toString() });
    } catch (err) {
      next(err);
    }
  });
}

