import { requireAuth, requireRole } from '../middleware/auth.js';
import { getClientIP, parseDeviceFromUserAgent } from '../middleware/securityMiddleware.js';
import { AuditLog } from '../models/AuditLog.js';
import { User } from '../models/User.js';

export function registerAuditLogRoutes(router) {
  // Get all audit logs (ADMIN only)
  router.get('/audit-logs', requireAuth, requireRole(['ADMIN']), async (_req, res, next) => {
    try {
      const logs = await AuditLog.find()
        .sort({ createdAt: -1 })
        .limit(100)
        .lean();

      // Get all unique userIds
      const userIds = [...new Set(logs.map(l => l.userId).filter(Boolean))];
      const users = await User.find({ _id: { $in: userIds } }).select('_id name email').lean();
      const userMap = new Map(users.map(u => [u._id.toString(), u.name || u.email]));

      res.json(
        logs.map((l) => {
          const userIdStr = l.userId?.toString?.() || l.userId;
          const userName = userMap.get(userIdStr) || l.userName || 'System';
          return {
            id: l._id.toString(),
            userId: userIdStr,
            userName,
            userEmail: userMap.has(userIdStr) ? users.find(u => u._id.toString() === userIdStr)?.email : null,
            action: l.action,
            details: l.details || '',
            ipAddress: l.ip || '127.0.0.1',
            device: l.device || 'Unknown Device',
            timestamp: l.createdAt,
            status: l.status || 'SUCCESS',
            riskLevel: l.riskLevel || 'LOW',
          };
        }),
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
          details: l.details || '',
          ipAddress: l.ip || '127.0.0.1',
          device: l.device || 'Unknown Device',
          timestamp: l.createdAt,
          status: l.status || 'SUCCESS',
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

      // Get real IP and device info
      const clientIP = getClientIP(req);
      const userAgent = req.headers['user-agent'] || '';
      const device = parseDeviceFromUserAgent(userAgent);

      const log = await AuditLog.create({
        userId: req.user.id,
        userName: req.user.name || req.user.email,
        action,
        details,
        ip: clientIP,
        device,
        status: status || 'SUCCESS',
        riskLevel: riskLevel || 'LOW',
      });

      res.status(201).json({ id: log._id.toString() });
    } catch (err) {
      next(err);
    }
  });
}

