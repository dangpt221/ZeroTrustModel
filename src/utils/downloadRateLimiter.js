import { AuditLog } from '../models/AuditLog.js';
import { User } from '../models/User.js';
import { getClientIP, parseDeviceFromUserAgent } from '../middleware/securityMiddleware.js';

/**
 * Download Rate Limiter - Prevent mass download attacks
 * Tracks download count per user and temporarily blocks if exceeded
 */

// In-memory store (in production, use Redis)
const downloadTracker = new Map();

// Configuration
const RATE_LIMIT = {
  WINDOW_MS: 60 * 1000,        // 1 minute window
  MAX_DOWNLOADS: 10,           // Max downloads per window
  BLOCK_DURATION_MS: 5 * 60 * 1000, // 5 minute block
  ALERT_THRESHOLD: 7,          // Alert when approaching limit
};

/**
 * Check if user is rate limited for downloads
 * @param {string} userId
 * @param {string} ip
 * @returns {object} - { blocked, reason, remaining, resetAt }
 */
export function checkDownloadRateLimit(userId, ip) {
  const key = userId || ip;
  const now = Date.now();

  let tracker = downloadTracker.get(key);

  // Initialize or reset if window expired
  if (!tracker || now - tracker.windowStart > RATE_LIMIT.WINDOW_MS) {
    tracker = {
      windowStart: now,
      count: 0,
      blocked: false,
      blockedUntil: null,
      downloads: [],
    };
    downloadTracker.set(key, tracker);
  }

  // Check if currently blocked
  if (tracker.blocked && now < tracker.blockedUntil) {
    return {
      blocked: true,
      reason: `Bạn đã tải quá nhiều tài liệu. Vui lòng chờ ${Math.ceil((tracker.blockedUntil - now) / 1000)} giây.`,
      remaining: 0,
      resetAt: new Date(tracker.blockedUntil).toISOString(),
      retryAfter: Math.ceil((tracker.blockedUntil - now) / 1000),
    };
  }

  // Reset block if expired
  if (tracker.blocked && now >= tracker.blockedUntil) {
    tracker.blocked = false;
    tracker.blockedUntil = null;
    tracker.windowStart = now;
    tracker.count = 0;
  }

  return {
    blocked: false,
    remaining: Math.max(0, RATE_LIMIT.MAX_DOWNLOADS - tracker.count),
    count: tracker.count,
    windowResetsAt: new Date(tracker.windowStart + RATE_LIMIT.WINDOW_MS).toISOString(),
  };
}

/**
 * Record a download attempt
 * @param {string} userId
 * @param {string} ip
 * @param {string} documentId
 * @param {string} documentTitle
 */
export async function recordDownload(userId, ip, documentId, documentTitle) {
  const key = userId || ip;
  const now = Date.now();

  let tracker = downloadTracker.get(key);
  if (!tracker) {
    tracker = {
      windowStart: now,
      count: 0,
      blocked: false,
      blockedUntil: null,
      downloads: [],
    };
  }

  // Check if we need to reset window
  if (now - tracker.windowStart > RATE_LIMIT.WINDOW_MS) {
    tracker.windowStart = now;
    tracker.count = 0;
    tracker.downloads = [];
  }

  // Record this download
  tracker.count += 1;
  tracker.downloads.push({
    documentId,
    documentTitle,
    timestamp: now,
  });

  // Check if we need to block
  if (tracker.count > RATE_LIMIT.MAX_DOWNLOADS) {
    tracker.blocked = true;
    tracker.blockedUntil = now + RATE_LIMIT.BLOCK_DURATION_MS;
  }

  downloadTracker.set(key, tracker);

  // Alert on high download activity
  if (tracker.count === RATE_LIMIT.ALERT_THRESHOLD) {
    await AuditLog.create({
      userId: userId || null,
      userName: 'System',
      action: 'RATE_LIMIT_ALERT',
      details: `User approaching download limit: ${tracker.count}/${RATE_LIMIT.MAX_DOWNLOADS} downloads in current window`,
      ip,
      device: 'System',
      status: 'WARNING',
      riskLevel: 'MEDIUM',
      metadata: {
        userId,
        documentId,
        documentTitle,
        count: tracker.count,
        limit: RATE_LIMIT.MAX_DOWNLOADS,
      },
    });
  }

  // Log blocking event
  if (tracker.blocked) {
    await AuditLog.create({
      userId: userId || null,
      userName: 'System',
      action: 'RATE_LIMIT_BLOCKED',
      details: `User blocked from downloading: exceeded ${RATE_LIMIT.MAX_DOWNLOADS} downloads per minute`,
      ip,
      device: 'System',
      status: 'BLOCKED',
      riskLevel: 'HIGH',
      metadata: {
        userId,
        blockedUntil: tracker.blockedUntil,
        totalDownloadsBlocked: tracker.downloads.length,
      },
    });
  }
}

/**
 * Get download statistics for a user
 */
export function getDownloadStats(userId, ip) {
  const key = userId || ip;
  const tracker = downloadTracker.get(key);

  if (!tracker) {
    return {
      count: 0,
      remaining: RATE_LIMIT.MAX_DOWNLOADS,
      blocked: false,
      windowResetsAt: null,
      recentDownloads: [],
    };
  }

  return {
    count: tracker.count,
    remaining: Math.max(0, RATE_LIMIT.MAX_DOWNLOADS - tracker.count),
    blocked: tracker.blocked,
    windowResetsAt: new Date(tracker.windowStart + RATE_LIMIT.WINDOW_MS).toISOString(),
    blockedUntil: tracker.blocked ? new Date(tracker.blockedUntil).toISOString() : null,
    recentDownloads: tracker.downloads.slice(-20).map(d => ({
      documentId: d.documentId,
      documentTitle: d.documentTitle,
      timestamp: new Date(d.timestamp).toISOString(),
    })),
  };
}

/**
 * Express middleware for download rate limiting
 */
export async function downloadRateLimitMiddleware(req, res, next) {
  try {
    const userId = req.user?.id;
    const ip = getClientIP(req);
    const { id } = req.params;

    // Check rate limit
    const limitCheck = checkDownloadRateLimit(userId, ip);

    // Attach rate limit info to response headers
    res.setHeader('X-RateLimit-Limit', RATE_LIMIT.MAX_DOWNLOADS);
    res.setHeader('X-RateLimit-Remaining', limitCheck.remaining);
    res.setHeader('X-RateLimit-Reset', limitCheck.windowResetsAt);

    if (limitCheck.blocked) {
      res.setHeader('Retry-After', limitCheck.retryAfter);
      return res.status(429).json({
        message: limitCheck.reason,
        rateLimit: {
          blocked: true,
          retryAfter: limitCheck.retryAfter,
          remaining: 0,
        },
      });
    }

    // Get document info for logging
    const { Document } = await import('../models/Document.js');
    const document = await Document.findById(id).select('title classification securityLevel');

    // Record download after successful access
    const originalJson = res.json.bind(res);
    res.json = function(body) {
      if (body.url || (body.success !== false)) {
        recordDownload(userId, ip, id, document?.title || 'Unknown').catch(console.error);
      }
      return originalJson(body);
    };

    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Reset rate limit for a user (admin function)
 */
export function resetDownloadRateLimit(userId, ip) {
  const key = userId || ip;
  downloadTracker.delete(key);
  return { success: true, message: 'Rate limit reset' };
}

/**
 * Get all rate-limited users (admin)
 */
export function getAllRateLimitStatus() {
  const now = Date.now();
  const status = [];

  for (const [key, tracker] of downloadTracker.entries()) {
    if (tracker.blocked || tracker.count > 0) {
      status.push({
        key,
        count: tracker.count,
        blocked: tracker.blocked,
        blockedUntil: tracker.blockedUntil ? new Date(tracker.blockedUntil).toISOString() : null,
        windowStart: new Date(tracker.windowStart).toISOString(),
        recentDownloads: tracker.downloads.length,
      });
    }
  }

  return status.sort((a, b) => b.count - a.count);
}
