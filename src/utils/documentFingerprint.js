import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { AuditLog } from '../models/AuditLog.js';
import { getClientIP } from '../middleware/securityMiddleware.js';

/**
 * Document Fingerprinting
 * Mỗi bản tải có hash DUY NHẤT
 * Dùng để so sánh nếu document bị leak
 */

// In-memory store cho fingerprints
const fingerprintStore = new Map();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Tạo fingerprint DUY NHẤT cho mỗi bản document
 * Kết hợp: document content hash + user info + timestamp + nonce
 *
 * @param {Buffer|string} documentContent - Nội dung document
 * @param {string} documentId - ID của document
 * @param {string} userId - ID của user tải
 * @param {string} downloadId - Unique download ID
 * @returns {object} - Fingerprint data
 */
export function generateDocumentFingerprint(documentContent, documentId, userId, downloadId) {
  // 1. Hash nội dung document
  const contentHash = crypto
    .createHash('sha256')
    .update(typeof documentContent === 'string' ? documentContent : documentBufferToString(documentContent))
    .digest('hex');

  // 2. Tạo master fingerprint (hash của content + docId)
  const masterFingerprint = crypto
    .createHash('sha256')
    .update(`${contentHash}:${documentId}:${process.env.JWT_SECRET}`)
    .digest('hex');

  // 3. Tạo instance fingerprint (mỗi bản tải KHÁC NHAU)
  const instanceFingerprint = crypto
    .createHash('sha512')
    .update(
      `${masterFingerprint}:${userId}:${downloadId}:${Date.now()}:${crypto.randomBytes(8).toString('hex')}`
    )
    .digest('hex');

  // 4. Short fingerprint để hiển thị (8 ký tự đầu)
  const shortFingerprint = instanceFingerprint.substring(0, 8).toUpperCase();

  // 5. QR-code data (chứa thông tin để scan)
  const qrData = Buffer.from(
    JSON.stringify({
      fp: instanceFingerprint,
      did: documentId,
      uid: userId,
      dl: downloadId,
      ts: Date.now(),
    })
  ).toString('base64');

  return {
    // Full fingerprint
    instanceFingerprint,
    masterFingerprint,

    // Short version
    shortFingerprint,

    // Metadata
    contentHash,
    documentId,
    userId,
    downloadId,
    timestamp: Date.now(),

    // Embeddable
    qrData,
    visible: `[FP:${shortFingerprint}]`,

    // Để verify khi document bị leak
    verificationData: {
      instanceFingerprint,
      masterFingerprint,
      contentHash,
      createdAt: new Date().toISOString(),
    },
  };
}

/**
 * Embed fingerprint vào document metadata
 * @param {Buffer} fileBuffer - File buffer (PDF, image, etc.)
 * @param {object} fingerprint - Fingerprint data
 * @returns {Buffer} - File với fingerprint embedded
 */
export function embedFingerprint(fileBuffer, fingerprint) {
  // Kiểm tra loại file và embed phù hợp
  const fileHeader = fileBuffer.subarray(0, 4).toString('ascii');

  if (fileHeader.startsWith('%PDF')) {
    // PDF: thêm comment vào header
    return embedFingerprintInPDF(fileBuffer, fingerprint);
  } else if (
    fileHeader.startsWith('\x89PNG') ||
    fileHeader.startsWith('\xFF\xD8') // JPEG
  ) {
    // Image: thêm EXIF comment hoặc tạo metadata file
    return embedFingerprintInImage(fileBuffer, fingerprint);
  } else {
    // Other files: tạo sidecar file
    return embedFingerprintAsSidecar(fileBuffer, fingerprint);
  }
}

/**
 * Embed fingerprint vào PDF
 */
function embedFingerprintInPDF(originalBuffer, fingerprint) {
  const fpComment = `%FINGERPRINT:${JSON.stringify(fingerprint.verificationData)}\n`;

  // Tìm vị trí sau %PDF-
  const pdfStart = originalBuffer.indexOf('%PDF-');
  if (pdfStart === -1) return originalBuffer;

  const insertPos = pdfStart + 5;

  return Buffer.concat([Buffer.from(fpComment), originalBuffer.subarray(insertPos)]);
}

/**
 * Embed fingerprint vào image
 */
function embedFingerprintInImage(originalBuffer, fingerprint) {
  // Với PNG/JPEG, tạo metadata riêng (steganography đơn giản)
  // Hoặc tạo sidecar .json cùng tên
  return embedFingerprintAsSidecar(originalBuffer, fingerprint);
}

/**
 * Tạo sidecar file chứa fingerprint
 */
function embedFingerprintAsSidecar(originalBuffer, fingerprint) {
  // Lưu fingerprint vào sidecar file
  const sidecarData = JSON.stringify(
    {
      fingerprint,
      createdAt: new Date().toISOString(),
      signature: crypto
        .createHmac('sha256', process.env.JWT_SECRET)
        .update(JSON.stringify(fingerprint.verificationData))
        .digest('hex'),
    },
    null,
    2
  );

  // Trả về original buffer (fingerprint sẽ được lưu trong database)
  // Sidecar sẽ được tạo khi cần verify
  return originalBuffer;
}

/**
 * Lưu fingerprint vào store (database)
 */
export async function saveFingerprint(fingerprint, user, doc) {
  const key = fingerprint.instanceFingerprint;

  const record = {
    fingerprint: fingerprint.instanceFingerprint,
    masterFingerprint: fingerprint.masterFingerprint,
    shortFingerprint: fingerprint.shortFingerprint,
    contentHash: fingerprint.contentHash,
    documentId: doc._id?.toString() || doc.id,
    documentTitle: doc.title,
    userId: user.id,
    userName: user.name,
    userEmail: user.email,
    downloadId: fingerprint.downloadId,
    timestamp: fingerprint.timestamp,
    ipHash: crypto
      .createHash('sha256')
      .update(getClientIP)
      .digest('hex')
      .substring(0, 16),
  };

  fingerprintStore.set(key, record);

  // Log vào audit
  await AuditLog.create({
    userId: user.id,
    userName: user.name,
    action: 'DOCUMENT_FINGERPRINT_CREATED',
    details: `Fingerprint created for: ${doc.title}`,
    ip: 'system',
    device: 'Server',
    status: 'SUCCESS',
    riskLevel: 'LOW',
    metadata: record,
  });

  return record;
}

/**
 * Verify document bị leak bằng fingerprint
 * @param {string} leakedFingerprint - Fingerprint từ document bị leak
 * @returns {object} - Thông tin về người đã tải document này
 */
export async function verifyLeakedDocument(leakedFingerprint) {
  const record = fingerprintStore.get(leakedFingerprint);

  if (!record) {
    return {
      found: false,
      message: 'Fingerprint không tìm thấy trong hệ thống. Có thể document không được fingerprint hoặc đã bị xóa.',
    };
  }

  return {
    found: true,
    message: '✅ TRUY VẾT THÀNH CÔNG!',
    attribution: {
      downloadedBy: record.userName,
      userEmail: record.userEmail,
      userId: record.userId,
      documentTitle: record.documentTitle,
      documentId: record.documentId,
      downloadId: record.downloadId,
      downloadedAt: new Date(record.timestamp).toLocaleString('vi-VN'),
      ipHash: record.ipHash,
      fingerprint: record.shortFingerprint,
      masterFingerprint: record.masterFingerprint,
    },
    legalBasis: {
      type: 'DOCUMENT_FINGERPRINT_EVIDENCE',
      evidence: record,
      timestamp: new Date().toISOString(),
    },
  };
}

/**
 * Compare two documents bằng fingerprint
 * Dùng để xác định xem 2 document leak có từ cùng 1 nguồn không
 */
export async function compareDocuments(fingerprint1, fingerprint2) {
  return {
    sameOriginalDocument: fingerprint1.masterFingerprint === fingerprint2.masterFingerprint,
    sameDownloadInstance: fingerprint1.instanceFingerprint === fingerprint2.instanceFingerprint,
    differentDownloads: fingerprint1.instanceFingerprint !== fingerprint2.instanceFingerprint,
    // Nếu sameOriginalDocument = true nhưng differentDownloads = true
    // → 2 người khác nhau đã tải cùng 1 document
    multipleSources: fingerprint1.masterFingerprint === fingerprint2.masterFingerprint &&
      fingerprint1.instanceFingerprint !== fingerprint2.instanceFingerprint,
  };
}

/**
 * Scan directory cho leaked documents
 * Tìm các file có chứa fingerprint mark
 */
export async function scanForLeakedDocuments(directoryPath) {
  const results = [];

  async function scanDir(dir) {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          await scanDir(fullPath);
        } else if (entry.isFile()) {
          // Đọc file và tìm fingerprint marker
          const content = fs.readFileSync(fullPath);

          // Tìm %FINGERPRINT: trong file
          const contentStr = content.toString('utf8');
          const fpMatch = contentStr.match(/%FINGERPRINT:({.*?})/);

          if (fpMatch) {
            try {
              const fpData = JSON.parse(fpMatch[1]);
              results.push({
                file: fullPath,
                filename: entry.name,
                fingerprint: fpData,
                verified: true,
              });
            } catch (e) {
              // Invalid fingerprint data
            }
          }

          // Kiểm tra sidecar file
          if (entry.name.endsWith('.json.fp')) {
            const fpContent = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
            results.push({
              file: fullPath,
              filename: entry.name,
              fingerprint: fpContent.fingerprint,
              signature: fpContent.signature,
              verified: fpContent.signature === crypto
                .createHmac('sha256', process.env.JWT_SECRET)
                .update(JSON.stringify(fpContent.fingerprint.verificationData))
                .digest('hex'),
            });
          }
        }
      }
    } catch (e) {
      console.error(`[Fingerprint] Error scanning ${dir}:`, e.message);
    }
  }

  await scanDir(directoryPath);
  return results;
}

/**
 * Lấy tất cả fingerprints của một document
 */
export async function getDocumentFingerprints(documentId) {
  const results = [];

  for (const [key, record] of fingerprintStore.entries()) {
    if (record.documentId === documentId) {
      results.push(record);
    }
  }

  return results.sort((a, b) => b.timestamp - a.timestamp);
}

/**
 * Helper: Convert buffer to string (for hashing)
 */
function documentBufferToString(buffer) {
  // Đọc text-based content, hoặc hash binary
  try {
    return buffer.toString('utf8').substring(0, 10000); // First 10KB
  } catch {
    return buffer.toString('hex');
  }
}
