import crypto from 'crypto';
import { AuditLog } from '../models/AuditLog.js';
import { getClientIP } from '../middleware/securityMiddleware.js';

/**
 * Forensic Watermarking - Mỗi bản tải đều có "dấu vân tay" duy nhất
 * Dùng để truy vết nếu tài liệu bị leak ra ngoài
 */

/**
 * Tạo watermark metadata cho một lượt tải
 * @param {object} user - User object (req.user)
 * @param {object} doc - Document object
 * @param {string} ip - Client IP
 * @returns {object} - Watermark data
 */
export function generateWatermarkData(user, doc, ip) {
  const downloadId = crypto.randomUUID();
  const timestamp = Date.now();

  // Hash IP để bảo mật (vẫn track được nhưng không expose IP gốc)
  const hashedIP = crypto
    .createHash('sha256')
    .update(ip + process.env.JWT_SECRET)
    .digest('hex')
    .substring(0, 16);

  const watermarkData = {
    // Metadata
    downloadId,
    timestamp,
    timestampISO: new Date(timestamp).toISOString(),

    // User info
    userId: user.id,
    userName: user.name,
    userEmail: user.email,
    userRole: user.role,

    // Document info
    documentId: doc._id?.toString() || doc.id,
    documentTitle: doc.title,
    documentClassification: doc.classification,
    documentSecurityLevel: doc.securityLevel,

    // Access info
    ipHash: hashedIP,
    accessTime: new Date(timestamp).toLocaleString('vi-VN'),
    reason: 'DOWNLOAD',
  };

  // Generate visible watermark text
  const visibleWatermark = `TOI: ${user.name} | ${new Date(timestamp).toLocaleString('vi-VN')} | IP: ${hashedIP}`;

  // Generate hidden watermark (base64 encoded JSON)
  const hiddenWatermark = Buffer.from(JSON.stringify(watermarkData)).toString('base64');

  // Generate cryptographic signature để prevent tampering
  const signatureData = JSON.stringify({
    downloadId,
    userId: user.id,
    documentId: watermarkData.documentId,
    timestamp,
    ipHash: hashedIP,
  });
  const signature = crypto
    .createHmac('sha256', process.env.JWT_SECRET || 'nexus-secret')
    .update(signatureData)
    .digest('hex')
    .substring(0, 32);

  return {
    downloadId,
    visibleWatermark,
    hiddenWatermark,
    watermarkData,
    signature,
    // Để embed vào file
    embeddable: {
      text: visibleWatermark,
      metadata: {
        DownloadID: downloadId,
        UserID: user.id,
        DocID: watermarkData.documentId,
        Timestamp: timestamp,
        IPHash: hashedIP,
        Signature: signature,
      },
    },
  };
}

/**
 * Xác minh watermark từ document bị leak
 * @param {string} hiddenWatermark - Base64 encoded watermark
 * @returns {object} - Verification result
 */
export function verifyWatermark(hiddenWatermark) {
  try {
    const decoded = JSON.parse(Buffer.from(hiddenWatermark, 'base64').toString('utf8'));

    // Verify signature
    const signatureData = JSON.stringify({
      downloadId: decoded.downloadId,
      userId: decoded.userId,
      documentId: decoded.documentId,
      timestamp: decoded.timestamp,
      ipHash: decoded.ipHash,
    });
    const expectedSignature = crypto
      .createHmac('sha256', process.env.JWT_SECRET || 'nexus-secret')
      .update(signatureData)
      .digest('hex')
      .substring(0, 32);

    const isValid = decoded.signature === expectedSignature;

    return {
      valid: isValid,
      data: isValid ? decoded : null,
      message: isValid
        ? 'Watermark hợp lệ - Có thể truy vết'
        : 'Watermark bị sửa đổi hoặc giả mạo',
      forensicInfo: isValid
        ? {
            downloadedBy: decoded.userName,
            userEmail: decoded.userEmail,
            userRole: decoded.userRole,
            documentTitle: decoded.documentTitle,
            documentClassification: decoded.documentClassification,
            downloadedAt: decoded.accessTime,
            ipHash: decoded.ipHash,
            downloadId: decoded.downloadId,
          }
        : null,
    };
  } catch (err) {
    return {
      valid: false,
      data: null,
      message: 'Không thể giải mã watermark - Có thể đã bị xóa',
      forensicInfo: null,
    };
  }
}

/**
 * Tạo watermark overlay SVG cho PDF/Image
 * @param {object} watermarkData
 * @returns {string} - SVG watermark overlay
 */
export function generateWatermarkSVG(watermarkData) {
  const { visibleWatermark, downloadId } = watermarkData;

  // Tạo nhiều watermark xoay nghiêng trên document
  const watermarks = [];
  const positions = [
    { x: 100, y: 200, rotate: -30 },
    { x: 300, y: 400, rotate: -45 },
    { x: 500, y: 600, rotate: -30 },
    { x: 200, y: 700, rotate: -60 },
    { x: 400, y: 300, rotate: -45 },
    { x: 600, y: 500, rotate: -30 },
  ];

  positions.forEach((pos, i) => {
    watermarks.push(`
      <text
        x="${pos.x}"
        y="${pos.y}"
        font-family="Arial, sans-serif"
        font-size="12"
        fill="rgba(128, 128, 128, 0.15)"
        transform="rotate(${pos.rotate}, ${pos.x}, ${pos.y})"
      >
        ${visibleWatermark}
      </text>
    `);
  });

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
      ${watermarks.join('')}
    </svg>
  `;
}

/**
 * Ghi watermark vào audit log
 */
export async function logWatermarkedDownload(req, doc, watermark) {
  await AuditLog.create({
    userId: req.user.id,
    userName: req.user.name,
    action: 'DOCUMENT_WATERMARKED_DOWNLOAD',
    details: `Watermarked download: ${doc.title}`,
    ip: getClientIP(req),
    device: req.headers['user-agent'] || 'Unknown',
    status: 'SUCCESS',
    riskLevel: 'MEDIUM',
    metadata: {
      documentId: doc._id?.toString() || doc.id,
      documentTitle: doc.title,
      documentClassification: doc.classification,
      downloadId: watermark.downloadId,
      watermarkSignature: watermark.signature,
      watermarkVisible: watermark.visibleWatermark,
      userRole: req.user.role,
    },
  });
}

/**
 * Embed watermark vào text content
 */
export function embedWatermarkInText(text, watermark) {
  const separator = '\n\n--- WATERMARK ---\n';
  const watermarkLine = `[${watermark.visibleWatermark}] [ID: ${watermark.downloadId}]`;
  return text + separator + watermarkLine;
}

/**
 * Embed watermark vào binary file (PDF header)
 */
export function embedWatermarkInPDF(originalBuffer, watermark) {
  // PDF watermark: thêm comment vào header
  const watermarkComment = `%WATERMARK:${Buffer.from(JSON.stringify(watermark.watermarkData)).toString('base64')}\n`;

  // Chèn vào sau PDF header (%PDF-)
  const pdfHeader = originalBuffer.indexOf('%PDF-');
  if (pdfHeader === -1) {
    // Không phải PDF, trả về nguyên bản
    return originalBuffer;
  }

  // Tìm vị trí sau header
  const insertPos = pdfHeader + 5; // sau '%PDF-'
  return Buffer.concat([
    originalBuffer.subarray(0, insertPos),
    Buffer.from(watermarkComment),
    originalBuffer.subarray(insertPos),
  ]);
}
