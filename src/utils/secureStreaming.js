import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import { AuditLog } from '../models/AuditLog.js';
import { Document } from '../models/Document.js';
import { getClientIP } from '../middleware/securityMiddleware.js';
import { generateWatermarkData } from './forensicWatermark.js';
import { generateDocumentFingerprint } from './documentFingerprint.js';
import { createDecryptStream } from './encryption.js';

/**
 * Secure Streaming - Server-side document rendering
 * ZERO TRUST ENFORCEMENT: No temp files. In-memory decryption pipeline.
 */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.join(__dirname, '../../uploads/documents');

export async function streamSecureDocument(req, res, doc, user) {
  const ip = getClientIP(req);
  const downloadId = crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');
  const watermark = generateWatermarkData(user, doc, ip);
  const fingerprint = generateDocumentFingerprint('content', doc._id?.toString() || doc.id, user.id, downloadId);

  await AuditLog.create({
    userId: user.id,
    userName: user.name,
    action: 'DOCUMENT_SECURE_STREAM',
    details: `Secure memory stream pipeline: ${doc.title}`,
    ip,
    device: req.headers['user-agent'] || 'Unknown',
    status: 'SUCCESS',
    riskLevel: 'LOW',
    metadata: {
      documentId: doc._id?.toString() || doc.id,
      downloadId,
      watermarkId: watermark.downloadId,
      fingerprint: fingerprint.shortFingerprint,
    },
  });

  if (!doc.url) return { error: 'Document does not have a valid file attached' };

  let filePath = path.join(uploadsDir, path.basename(doc.url));
  const isEncrypted = path.basename(doc.url).startsWith('encrypted_');
  
  if (!fs.existsSync(filePath) && isEncrypted) {
    // attempt raw name if url lacked prefix incorrectly
    filePath = path.join(uploadsDir, `encrypted_${path.basename(doc.url)}`);
  }

  if (!fs.existsSync(filePath)) {
    return { error: 'Document file not found' };
  }

  // Check legacy files early before sending headers (Mongoose populates empty object with null values)
  if (isEncrypted && (!doc.encryptionMetadata || !doc.encryptionMetadata.dataKey || !doc.encryptionMetadata.iv || !doc.encryptionMetadata.authTag)) {
    return { error: 'Tài liệu sinh ra từ hệ thống cũ không hỗ trợ cơ chế bảo mật Envelope Encryption phi tập trung mới. Xin vui lòng Upload lại file.' };
  }

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

  res.setHeader('Content-Type', contentType);
  res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(doc.title)}.${ext}"`);
  res.setHeader('X-Document-Streaming', 'Secure-Memory-Pipe');
  res.setHeader('X-Watermark-Id', watermark.downloadId);
  res.setHeader('X-Fingerprint', fingerprint.shortFingerprint);
  res.setHeader('X-No-Cache', 'true');
  res.setHeader('X-Content-Options', 'nosniff');

  try {
    if (isEncrypted) {
      if (!doc.encryptionMetadata) {
        throw new Error('Thiếu encryptionMetadata. File bị hỏng hoặc cấu trúc quá cũ.');
      }
      // Khởi tạo Decrypt Stream VÀ KHÔNG lưu trực tiếp ra đĩa cứng!
      const decryptStream = createDecryptStream(filePath, doc.encryptionMetadata);
      
      decryptStream.on('error', (err) => {
        console.error('[SecureStream] Decryption integrity breached:', err);
        if (!res.headersSent) res.status(500).end('Integrity check failed during decryption.');
      });

      // Ống dẫn ra response client.
      if (ext === 'pdf') {
        // [STEGANOGRAPHY] Nặng đô - Đọc toàn bộ PDF vào RAM, nhúng metadata tàng hình và stream ra.
        const chunks = [];
        decryptStream.on('data', chunk => chunks.push(chunk));
        decryptStream.on('end', async () => {
          try {
            const pdfBuffer = Buffer.concat(chunks);
            const { PDFDocument, rgb } = await import('pdf-lib');
            const pdfDoc = await PDFDocument.load(pdfBuffer);
            
            // 1. Metadata Injection
            pdfDoc.setAuthor('Nexus ZeroTrust Security');
            pdfDoc.setSubject(`TracingFingerprint: ${fingerprint.shortFingerprint}`);
            pdfDoc.setKeywords([user.email || 'unknown', ip, new Date().toISOString(), watermark.downloadId]);
            pdfDoc.setCreator(`Nexus_DRM_${watermark.downloadId}`);

            // 2. Invisible Pixel Steganography (White text, size 1, opacity 0.02)
            const pages = pdfDoc.getPages();
            pages.forEach(page => {
              page.drawText(`NZT:${fingerprint.shortFingerprint}`, {
                x: 10, y: 10, size: 2, color: rgb(0.98, 0.98, 0.98), opacity: 0.03
              });
            });

            const watermarkedBytes = await pdfDoc.save();
            res.end(Buffer.from(watermarkedBytes));
          } catch (steganoErr) {
            console.error('[SecureStream] Steganography error:', steganoErr);
            if (!res.headersSent) res.status(500).end('Lỗi xử lý Watermark tàng hình.');
          }
        });
      } else {
        // Non-PDF files: stream directly
        decryptStream.pipe(res);
      }
    } else {
      // Unencrypted file fallback for legacy documents
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
    }
  } catch (err) {
    console.error('[SecureStream] Pipeline initialization error:', err);
    if (!res.headersSent) res.status(500).json({ message: 'Error establishing secure stream pipeline.' });
  }
}

// Giữ lại alias để code hiện tại vẫn import thành công, 
// nhưng core logic đã thống nhất dùng in-memory pipeline.
export const streamWatermarkedPDF = streamSecureDocument;


// ----------------------------------------------------------------------
// ENHANCED ANTI-REPLAY & DEVICE BINDING
// ----------------------------------------------------------------------

const validNonces = new Map(); // Store nonces temporarily to prevent replay attacks

export function generateSecurePreviewURL(documentId, userId, req, expiryMinutes = 30) {
  const ip = getClientIP(req) || 'unknown';
  const deviceId = req.headers['x-device-id'] || req.headers['user-agent'] || 'unknown';
  const nonce = crypto.randomUUID();
  const expiresAt = Date.now() + expiryMinutes * 60 * 1000;

  const payload = `${documentId}:${userId}:${ip}:${deviceId}:${nonce}:${expiresAt}`;
  const token = crypto
    .createHmac('sha256', process.env.JWT_SECRET || 'nexus-secret')
    .update(payload)
    .digest('hex');

  // Store nonce with expiry
  validNonces.set(nonce, { expiresAt, ip, deviceId, used: false });

  // Cleanup map occasionally
  for (const [key, val] of validNonces.entries()) {
    if (Date.now() > val.expiresAt) validNonces.delete(key);
  }

  return {
    previewUrl: `/api/documents/${documentId}/preview?token=${token}&nonce=${nonce}&exp=${expiresAt}`,
    expiresAt: new Date(expiresAt).toISOString(),
    expiresInMinutes: expiryMinutes,
  };
}

export function verifySecurePreviewToken(documentId, req) {
  const { token, nonce, exp } = req.query;
  const userId = req.user?.id || 'anonymous';
  const ip = getClientIP(req) || 'unknown';
  const deviceId = req.headers['x-device-id'] || req.headers['user-agent'] || 'unknown';

  if (!token || !nonce || !exp) return { valid: false, error: 'Missing security parameters' };
  
  if (Date.now() > parseInt(exp)) return { valid: false, error: 'Preview link expired' };

  // 1. Replay Check
  const nonceRecord = validNonces.get(nonce);
  if (!nonceRecord) return { valid: false, error: 'Invalid or forged token context' };
  if (nonceRecord.used) return { valid: false, error: 'Token already used (Replay Attack detected)' };

  // 2. Device Binding Check
  if (nonceRecord.ip !== ip || nonceRecord.deviceId !== deviceId) {
    return { valid: false, error: 'Device binding failed. This token was issued to a different device or network.' };
  }

  // 3. Signature Verification
  const payload = `${documentId}:${userId}:${ip}:${deviceId}:${nonce}:${exp}`;
  const expectedToken = crypto
    .createHmac('sha256', process.env.JWT_SECRET || 'nexus-secret')
    .update(payload)
    .digest('hex');

  if (crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expectedToken))) {
    // Mark nonce as used
    nonceRecord.used = true;
    return { valid: true };
  }

  return { valid: false, error: 'Invalid token signature' };
}


// ----------------------------------------------------------------------
// LEGACY SESSION MANAGER (FOR BACKWARD COMPATIBILITY)
// ----------------------------------------------------------------------
const documentSessions = new Map();

export function createDocumentAccessSession(documentId, userId, user) {
  const sessionId = crypto.randomUUID();
  const session = {
    sessionId, documentId, userId, userName: user.name, userRole: user.role,
    createdAt: Date.now(), expiresAt: Date.now() + 30 * 60 * 1000,
    accessCount: 0, lastAccessAt: Date.now(), revoked: false,
  };
  documentSessions.set(sessionId, session);
  return {
    sessionId, documentId, expiresAt: new Date(session.expiresAt).toISOString(),
    accessUrl: `/api/documents/session/${sessionId}/access`,
    revokeUrl: `/api/documents/session/${sessionId}/revoke`,
  };
}

export function verifyDocumentSession(sessionId) {
  const session = documentSessions.get(sessionId);
  if (!session) return { valid: false, error: 'Session not found or expired' };
  if (session.revoked) return { valid: false, error: 'Session has been revoked' };
  if (Date.now() > session.expiresAt) {
    documentSessions.delete(sessionId);
    return { valid: false, error: 'Session expired' };
  }
  session.accessCount++; session.lastAccessAt = Date.now();
  return { valid: true, session };
}

export function revokeDocumentSession(sessionId, revokedBy) {
  const session = documentSessions.get(sessionId);
  if (!session) return { success: false, error: 'Session not found' };
  session.revoked = true; session.revokedAt = Date.now(); session.revokedBy = revokedBy;
  return { success: true };
}

export function getActiveDocumentSessions(documentId = null) {
  const sessions = [];
  for (const [sessionId, session] of documentSessions.entries()) {
    if (!session.revoked && Date.now() < session.expiresAt) {
      if (!documentId || session.documentId === documentId) {
        sessions.push({
          sessionId, documentId: session.documentId, userName: session.userName,
          userRole: session.userRole, createdAt: new Date(session.createdAt).toISOString(),
          expiresAt: new Date(session.expiresAt).toISOString(), accessCount: session.accessCount,
        });
      }
    }
  }
  return sessions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}
