import express from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import {
  activateEmergencyLock,
  deactivateEmergencyLock,
  getEmergencyLockStatus,
} from '../utils/emergencyLock.js';
import { getAnomalyStats } from '../utils/anomalyDetection.js';
import { getActiveLinks } from '../utils/secureDownloadLink.js';
import { getActiveDocumentSessions } from '../utils/secureStreaming.js';

const router = express.Router();

/**
 * GET /api/emergency/status
 * Lấy trạng thái emergency lock
 */
router.get('/emergency/status', requireAuth, requireRole(['ADMIN']), async (req, res, next) => {
  try {
    const status = getEmergencyLockStatus();
    res.json(status);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/emergency/activate
 * Kích hoạt emergency lock
 */
router.post('/emergency/activate', requireAuth, requireRole(['ADMIN']), async (req, res, next) => {
  try {
    const { type, targetId, reason, autoUnlockMinutes } = req.body;

    if (!type || !reason) {
      return res.status(400).json({ message: 'Missing type or reason' });
    }

    const validTypes = ['SYSTEM', 'DOCUMENT', 'USER', 'DEPARTMENT', 'BREACH_DETECTED'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ message: 'Invalid emergency type' });
    }

    const result = await activateEmergencyLock(req, type, targetId, reason, autoUnlockMinutes);

    res.json({
      success: true,
      message: `Emergency lock đã được kích hoạt: ${type}`,
      ...result,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/emergency/deactivate
 * Hủy emergency lock
 */
router.post('/emergency/deactivate', requireAuth, requireRole(['ADMIN']), async (req, res, next) => {
  try {
    const { reason } = req.body;
    const result = await deactivateEmergencyLock(req, reason || 'Manual deactivation');

    res.json({
      success: true,
      message: 'Emergency lock đã được hủy',
      ...result,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/emergency/anomaly-stats
 * Lấy thống kê anomaly
 */
router.get('/emergency/anomaly-stats', requireAuth, requireRole(['ADMIN']), async (req, res, next) => {
  try {
    const stats = await getAnomalyStats();
    res.json(stats);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/emergency/active-links
 * Lấy danh sách secure download links đang active
 */
router.get('/emergency/active-links', requireAuth, requireRole(['ADMIN']), async (req, res, next) => {
  try {
    const { userId } = req.query;
    const links = getActiveLinks(userId || null);
    res.json({ count: links.length, links });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/emergency/active-sessions
 * Lấy danh sách document access sessions
 */
router.get('/emergency/active-sessions', requireAuth, requireRole(['ADMIN']), async (req, res, next) => {
  try {
    const { documentId } = req.query;
    const sessions = getActiveDocumentSessions(documentId || null);
    res.json({ count: sessions.length, sessions });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/emergency/revoke-link/:downloadId
 * Revoke một secure download link
 */
router.post('/emergency/revoke-link/:downloadId', requireAuth, requireRole(['ADMIN']), async (req, res, next) => {
  try {
    const { revokeDownloadLink } = await import('../utils/secureDownloadLink.js');
    const result = await revokeDownloadLink(req.params.downloadId, req.user.id);

    if (!result.success) {
      return res.status(404).json(result);
    }

    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
