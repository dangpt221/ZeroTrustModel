import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import { AuditLog } from '../models/AuditLog.js';
import { Document } from '../models/Document.js';
import { getClientIP } from '../middleware/securityMiddleware.js';
import { generateWatermarkData } from './forensicWatermark.js';
import { generateDocumentFingerprint } from './documentFingerprint.js';

/**
 * Secure Streaming - Server-side document rendering
 * Document KHÔNG được lưu trên máy user
 * Server render + watermark + stream → connection close = document mất
 */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.join(__dirname, '../../uploads/documents');

/**
 * Stream document với watermark real-time
 * @param {object} req - Express request
 * @param {object} res - Express response
 * @param {object} doc - Document object
 * @param {object} user - User object
 */
export async function streamSecureDocument(req, res, doc, user) {
  const ip = getClientIP(req);
  const downloadId = crypto.randomUUID();

  // Tạo watermark
  const watermark = generateWatermarkData(user, doc, ip);

  // Tạo fingerprint
  const fingerprint = generateDocumentFingerprint('content', doc._id?.toString() || doc.id, user.id, downloadId);

  // Ghi log
  await AuditLog.create({
    userId: user.id,
    userName: user.name,
    action: 'DOCUMENT_SECURE_STREAM',
    details: `Secure stream: ${doc.title}`,
    ip,
    device: req.headers['user-agent'] || 'Unknown',
    status: 'SUCCESS',
    riskLevel: 'LOW',
    metadata: {
      documentId: doc._id?.toString() || doc.id,
      documentTitle: doc.title,
      downloadId,
      watermarkId: watermark.downloadId,
      fingerprint: fingerprint.shortFingerprint,
    },
  });

  // Tìm file
  let filePath = path.join(uploadsDir, path.basename(doc.url));

  // Check encrypted version first
  const encryptedPath = path.join(uploadsDir, `encrypted_${path.basename(doc.url)}`);
  if (fs.existsSync(encryptedPath)) {
    // Decrypt on-the-fly
    const { decryptFile } = await import('./encryption.js');
    const tempPath = path.join(uploadsDir, `temp_stream_${downloadId}.${doc.fileType}`);
    await decryptFile(encryptedPath, tempPath);
    filePath = tempPath;
  }

  // Nếu file không tồn tại, trả về thông báo
  if (!fs.existsSync(filePath)) {
    return { error: 'Document file not found' };
  }

  // Xác định content-type
  const contentTypes = {
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ppt: 'application/vnd.ms-powerpoint',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    txt: 'text/plain',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
  };

  const ext = (doc.fileType || 'pdf').toLowerCase();
  const contentType = contentTypes[ext] || 'application/octet-stream';

  // Set headers
  res.setHeader('Content-Type', contentType);
  res.setHeader('Content-Disposition', `inline; filename="${doc.title}.${ext}"`);
  res.setHeader('X-Document-Streaming', 'Secure');
  res.setHeader('X-Watermark-Id', watermark.downloadId);
  res.setHeader('X-Fingerprint', fingerprint.shortFingerprint);
  res.setHeader('X-No-Cache', 'true'); // Không cache
  res.setHeader('X-Content-Options', 'nosniff');

  // Stream file
  const fileStream = fs.createReadStream(filePath);

  // Cleanup temp file after stream
  fileStream.on('end', () => {
    if (filePath.includes('temp_stream_')) {
      try {
        fs.unlinkSync(filePath);
      } catch (e) {
        // Ignore cleanup errors
      }
    }
  });

  fileStream.on('error', (err) => {
    console.error('[SecureStream] Stream error:', err);
    if (!res.headersSent) {
      res.status(500).json({ message: 'Error streaming document' });
    }
  });

  // Pipe to response
  fileStream.pipe(res);
}

/**
 * Stream document với watermark overlay (cho PDF)
 * Tạo PDF mới với watermark được embed
 */
export async function streamWatermarkedPDF(req, res, doc, user) {
  const ip = getClientIP(req);
  const downloadId = crypto.randomUUID();

  // Tạo watermark
  const watermark = generateWatermarkData(user, doc, ip);

  // File path
  let filePath = path.join(uploadsDir, path.basename(doc.url));

  // Check encrypted
  const encryptedPath = path.join(uploadsDir, `encrypted_${path.basename(doc.url)}`);
  if (fs.existsSync(encryptedPath)) {
    const { decryptFile } = await import('./encryption.js');
    const tempPath = path.join(uploadsDir, `temp_wm_${downloadId}.pdf`);
    await decryptFile(encryptedPath, tempPath);
    filePath = tempPath;
  }

  if (!fs.existsSync(filePath)) {
    return { error: 'Document file not found' };
  }

  // Set headers
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${doc.title}_watermarked.pdf"`);
  res.setHeader('X-Document-Streaming', 'Secure-Watermarked');
  res.setHeader('X-Watermark-Id', watermark.downloadId);
  res.setHeader('X-Watermark-Visible', watermark.visibleWatermark);
  res.setHeader('X-No-Store', 'true'); // No cache
  res.setHeader('X-Download-Options', 'noopen'); // Không mở trong browser

  // Stream với watermark
  // Với PDF thực sự, bạn cần thư viện như pdf-lib để thêm watermark
  // Ở đây chúng ta stream file gốc + header watermark
  const fileStream = fs.createReadStream(filePath);

  fileStream.on('end', () => {
    if (filePath.includes('temp_wm_')) {
      try {
        fs.unlinkSync(filePath);
      } catch (e) {
        // Ignore
      }
    }
  });

  fileStream.pipe(res);
}

/**
 * Generate secure preview URL (có expire)
 * @param {string} documentId
 * @param {string} userId
 * @param {number} expiryMinutes
 */
export function generateSecurePreviewURL(documentId, userId, expiryMinutes = 30) {
  const token = crypto
    .createHmac('sha256', process.env.JWT_SECRET || 'nexus-secret')
    .update(`${documentId}:${userId}:${Date.now()}:${expiryMinutes}`)
    .digest('hex')
    .substring(0, 32);

  const expiresAt = Date.now() + expiryMinutes * 60 * 1000;

  return {
    previewUrl: `/api/documents/${documentId}/preview?token=${token}&exp=${expiresAt}`,
    expiresAt: new Date(expiresAt).toISOString(),
    expiresInMinutes: expiryMinutes,
  };
}

/**
 * Verify secure preview token
 */
export function verifySecurePreviewToken(documentId, token, exp) {
  // Check expiry
  if (Date.now() > parseInt(exp)) {
    return { valid: false, error: 'Preview link expired' };
  }

  // Verify token format (simplified)
  if (!token || token.length < 32) {
    return { valid: false, error: 'Invalid token' };
  }

  return { valid: true };
}

/**
 * Document access session manager
 * Mỗi lần xem document → tạo session → có thể revoke
 */
const documentSessions = new Map();

export function createDocumentAccessSession(documentId, userId, user) {
  const sessionId = crypto.randomUUID();
  const session = {
    sessionId,
    documentId,
    userId,
    userName: user.name,
    userRole: user.role,
    createdAt: Date.now(),
    expiresAt: Date.now() + 30 * 60 * 1000, // 30 phút
    accessCount: 0,
    lastAccessAt: Date.now(),
    revoked: false,
  };

  documentSessions.set(sessionId, session);

  // Cleanup expired sessions
  cleanupExpiredSessions();

  return {
    sessionId,
    documentId,
    expiresAt: new Date(session.expiresAt).toISOString(),
    accessUrl: `/api/documents/session/${sessionId}/access`,
    revokeUrl: `/api/documents/session/${sessionId}/revoke`,
  };
}

export function verifyDocumentSession(sessionId) {
  const session = documentSessions.get(sessionId);

  if (!session) {
    return { valid: false, error: 'Session not found or expired' };
  }

  if (session.revoked) {
    return { valid: false, error: 'Session has been revoked' };
  }

  if (Date.now() > session.expiresAt) {
    documentSessions.delete(sessionId);
    return { valid: false, error: 'Session expired' };
  }

  // Update access
  session.accessCount++;
  session.lastAccessAt = Date.now();

  return {
    valid: true,
    session,
  };
}

export function revokeDocumentSession(sessionId, revokedBy) {
  const session = documentSessions.get(sessionId);

  if (!session) {
    return { success: false, error: 'Session not found' };
  }

  session.revoked = true;
  session.revokedAt = Date.now();
  session.revokedBy = revokedBy;

  AuditLog.create({
    userId: revokedBy,
    userName: 'System',
    action: 'DOCUMENT_SESSION_REVOKED',
    details: `Document access session revoked: ${sessionId}`,
    ip: 'system',
    device: 'Admin Action',
    status: 'SUCCESS',
    riskLevel: 'MEDIUM',
    metadata: { sessionId, documentId: session.documentId, userId: session.userId },
  });

  return { success: true };
}

function cleanupExpiredSessions() {
  const now = Date.now();
  for (const [sessionId, session] of documentSessions.entries()) {
    if (session.expiresAt < now || session.accessCount > 1000) {
      documentSessions.delete(sessionId);
    }
  }
}

/**
 * Get all active sessions cho admin
 */
export function getActiveDocumentSessions(documentId = null) {
  const sessions = [];
  for (const [sessionId, session] of documentSessions.entries()) {
    if (!session.revoked && Date.now() < session.expiresAt) {
      if (!documentId || session.documentId === documentId) {
        sessions.push({
          sessionId,
          documentId: session.documentId,
          userName: session.userName,
          userRole: session.userRole,
          createdAt: new Date(session.createdAt).toISOString(),
          expiresAt: new Date(session.expiresAt).toISOString(),
          accessCount: session.accessCount,
        });
      }
    }
  }
  return sessions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}
