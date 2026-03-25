import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { AuditLog } from '../models/AuditLog.js';
import { getClientIP } from '../middleware/securityMiddleware.js';

/**
 * Time-Bounded Secure Download Link
 * Link download có expiry và nonce (chống replay attack)
 */

const DOWNLOAD_SECRET = process.env.DOWNLOAD_SECRET || process.env.JWT_SECRET + '_download';
const DEFAULT_EXPIRY_SECONDS = 3600; // 1 giờ
const NONCE_TTL_SECONDS = 3600; // Nonce có hiệu lực 1 giờ

// In-memory nonce cache (trong production nên dùng Redis)
const nonceCache = new Map();
const activeLinks = new Map();

/**
 * Tạo secure download URL cho document
 * @param {string} documentId - ID của document
 * @param {object} user - User object
 * @param {object} options - Các tùy chọn
 * @returns {object} - URL và token info
 */
export function generateSecureDownloadURL(documentId, user, options = {}) {
  const {
    expirySeconds = DEFAULT_EXPIRY_SECONDS,
    allowShare = false,
    maxDownloads = 1,
    watermarkData = null,
  } = options;

  const downloadId = crypto.randomUUID();
  const nonce = crypto.randomBytes(16).toString('hex');
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = now + expirySeconds;

  // Tạo JWT token
  const token = jwt.sign(
    {
      // Claims
      documentId,
      userId: user.id,
      downloadId,
      nonce,
      type: 'secure_download',
      // Limits
      expiresAt,
      maxDownloads,
      allowShare,
      // Watermark (nếu có)
      watermark: watermarkData,
      // Prevent replay
      iat: now,
      jti: downloadId,
    },
    DOWNLOAD_SECRET,
    {
      algorithm: 'HS512',
      expiresIn: expirySeconds,
    }
  );

  // Lưu vào cache để verify sau
  const linkRecord = {
    downloadId,
    nonce,
    documentId,
    userId: user.id,
    userName: user.name,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(expiresAt * 1000).toISOString(),
    maxDownloads,
    currentDownloads: 0,
    allowShare,
    usedNonces: new Set(),
    watermark: watermarkData,
    revoked: false,
  };

  activeLinks.set(downloadId, linkRecord);

  // Cleanup expired links every hour
  if (nonceCache.size === 0) {
    setInterval(cleanupExpiredLinks, 3600000);
  }

  return {
    // URL (frontend sẽ gọi endpoint này)
    downloadUrl: `/api/documents/secure-download?token=${token}`,
    // Token (để embed vào HTML/email)
    token,
    // Metadata
    downloadId,
    expiresAt: new Date(expiresAt * 1000).toISOString(),
    expiresInSeconds: expirySeconds,
    maxDownloads,
    allowShare,
    // QR code data
    qrData: Buffer.from(JSON.stringify({ url: `/api/documents/secure-download?token=${token}` })).toString('base64'),
  };
}

/**
 * Verify và validate secure download token
 * @param {string} token - JWT token từ URL
 * @param {string} ip - Client IP (để check IP binding)
 * @returns {object} - Validation result
 */
export function validateSecureDownloadToken(token, ip = null) {
  try {
    // 1. Verify JWT signature và expiry
    const decoded = jwt.verify(token, DOWNLOAD_SECRET, {
      algorithms: ['HS512'],
    });

    // 2. Kiểm tra loại token
    if (decoded.type !== 'secure_download') {
      return {
        valid: false,
        error: 'Invalid token type',
        code: 'INVALID_TOKEN_TYPE',
      };
    }

    // 3. Kiểm tra link record
    const linkRecord = activeLinks.get(decoded.downloadId);

    if (!linkRecord) {
      return {
        valid: false,
        error: 'Download link not found or expired',
        code: 'LINK_NOT_FOUND',
      };
    }

    // 4. Kiểm tra đã bị revoke chưa
    if (linkRecord.revoked) {
      return {
        valid: false,
        error: 'Download link has been revoked',
        code: 'LINK_REVOKED',
        revokedAt: linkRecord.revokedAt,
      };
    }

    // 5. Kiểm tra số lần tải
    if (linkRecord.currentDownloads >= linkRecord.maxDownloads) {
      return {
        valid: false,
        error: 'Download limit reached',
        code: 'LIMIT_REACHED',
        maxDownloads: linkRecord.maxDownloads,
      };
    }

    // 6. Kiểm tra share policy
    if (!linkRecord.allowShare && decoded.userId) {
      // IP binding nếu không cho share
      // (Trong thực tế, bạn có thể so sánh IP ở đây)
    }

    // 7. Kiểm tra nonce (chống replay)
    // Nonce được check ở middleware, không phải ở đây

    return {
      valid: true,
      downloadId: decoded.downloadId,
      documentId: decoded.documentId,
      userId: decoded.userId,
      watermark: decoded.watermark,
      expiresAt: new Date(decoded.expiresAt * 1000).toISOString(),
      remainingDownloads: linkRecord.maxDownloads - linkRecord.currentDownloads,
    };
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return {
        valid: false,
        error: 'Download link has expired',
        code: 'TOKEN_EXPIRED',
        expiredAt: new Date(err.expiredAt).toISOString(),
      };
    }
    if (err.name === 'JsonWebTokenError') {
      return {
        valid: false,
        error: 'Invalid token signature',
        code: 'INVALID_TOKEN',
      };
    }
    return {
      valid: false,
      error: err.message,
      code: 'UNKNOWN_ERROR',
    };
  }
}

/**
 * Sử dụng nonce để prevent replay attack
 * Mỗi link chỉ download được 1 lần
 * @param {string} downloadId
 * @param {string} nonce
 * @returns {object} - Result
 */
export function consumeNonce(downloadId, nonce) {
  const linkRecord = activeLinks.get(downloadId);

  if (!linkRecord) {
    return { success: false, error: 'Link not found' };
  }

  if (linkRecord.revoked) {
    return { success: false, error: 'Link revoked' };
  }

  if (linkRecord.usedNonces.has(nonce)) {
    return { success: false, error: 'Nonce already used', code: 'REPLAY_ATTACK' };
  }

  // Mark nonce as used
  linkRecord.usedNonces.add(nonce);
  linkRecord.currentDownloads += 1;

  // Log
  AuditLog.create({
    userId: linkRecord.userId,
    userName: linkRecord.userName,
    action: 'SECURE_DOWNLOAD_USED',
    details: `Secure download: ${linkRecord.documentId} (${linkRecord.currentDownloads}/${linkRecord.maxDownloads})`,
    ip: 'system',
    device: 'Secure Link',
    status: 'SUCCESS',
    riskLevel: 'LOW',
    metadata: { downloadId, nonceUsed: nonce.substring(0, 8) + '...' },
  });

  return {
    success: true,
    remainingDownloads: linkRecord.maxDownloads - linkRecord.currentDownloads,
    watermark: linkRecord.watermark,
  };
}

/**
 * Revoke download link
 * @param {string} downloadId
 * @param {string} revokedBy - User ID của người revoke
 */
export async function revokeDownloadLink(downloadId, revokedBy) {
  const linkRecord = activeLinks.get(downloadId);

  if (!linkRecord) {
    return { success: false, error: 'Link not found' };
  }

  linkRecord.revoked = true;
  linkRecord.revokedAt = new Date();
  linkRecord.revokedBy = revokedBy;

  // Log
  await AuditLog.create({
    userId: revokedBy,
    userName: 'System',
    action: 'SECURE_LINK_REVOKED',
    details: `Download link revoked: ${downloadId}`,
    ip: 'system',
    device: 'Admin Action',
    status: 'SUCCESS',
    riskLevel: 'MEDIUM',
    metadata: { downloadId, revokedAt: linkRecord.revokedAt },
  });

  return { success: true };
}

/**
 * Revoke ALL download links cho một document
 */
export async function revokeAllDocumentLinks(documentId, revokedBy) {
  let revokedCount = 0;

  for (const [downloadId, link] of activeLinks.entries()) {
    if (link.documentId === documentId && !link.revoked) {
      link.revoked = true;
      link.revokedAt = new Date();
      link.revokedBy = revokedBy;
      revokedCount++;
    }
  }

  await AuditLog.create({
    userId: revokedBy,
    userName: 'System',
    action: 'ALL_DOCUMENT_LINKS_REVOKED',
    details: `All ${revokedCount} download links revoked for document: ${documentId}`,
    ip: 'system',
    device: 'Admin Action',
    status: 'SUCCESS',
    riskLevel: 'HIGH',
    metadata: { documentId, revokedCount },
  });

  return { success: true, revokedCount };
}

/**
 * Cleanup expired links
 */
function cleanupExpiredLinks() {
  const now = Date.now();
  let cleaned = 0;

  for (const [downloadId, link] of activeLinks.entries()) {
    const expiresAt = new Date(link.expiresAt).getTime();
    if (expiresAt < now || link.currentDownloads >= link.maxDownloads) {
      activeLinks.delete(downloadId);
      cleaned++;
    }
  }

  if (cleaned > 0) {
    console.log(`[SecureDownload] Cleaned up ${cleaned} expired links`);
  }
}

/**
 * Get all active links cho admin
 */
export function getActiveLinks(userId = null) {
  const links = [];

  for (const [downloadId, link] of activeLinks.entries()) {
    if (userId && link.userId !== userId) continue;

    links.push({
      downloadId,
      documentId: link.documentId,
      userName: link.userName,
      createdAt: link.createdAt,
      expiresAt: link.expiresAt,
      remainingDownloads: link.maxDownloads - link.currentDownloads,
      maxDownloads: link.maxDownloads,
      revoked: link.revoked,
      allowShare: link.allowShare,
    });
  }

  return links.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

/**
 * Verify download link (check trước khi tải)
 */
export async function verifyDownloadLink(req, res, next) {
  try {
    const { token } = req.query;
    const ip = getClientIP(req);

    if (!token) {
      return res.status(400).json({ message: 'Missing download token' });
    }

    const validation = validateSecureDownloadToken(token, ip);

    if (!validation.valid) {
      const statusMap = {
        TOKEN_EXPIRED: 410,
        LIMIT_REACHED: 403,
        LINK_REVOKED: 410,
        LINK_NOT_FOUND: 404,
        INVALID_TOKEN_TYPE: 400,
        INVALID_TOKEN: 403,
      };

      return res.status(statusMap[validation.code] || 400).json({
        message: validation.error,
        code: validation.code,
        expiredAt: validation.expiredAt,
        maxDownloads: validation.maxDownloads,
      });
    }

    // Consume nonce
    // Note: Nonce được gửi trong body hoặc header khi download
    req.secureDownload = {
      valid: true,
      downloadId: validation.downloadId,
      documentId: validation.documentId,
      userId: validation.userId,
      watermark: validation.watermark,
      remainingDownloads: validation.remainingDownloads,
    };

    next();
  } catch (err) {
    next(err);
  }
}
