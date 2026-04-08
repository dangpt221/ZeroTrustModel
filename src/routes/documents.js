import express from "express";
import { requireAuth, requirePermission } from "../middleware/auth.js";
import * as documentController from "../controllers/documentController.js";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../../uploads/documents');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, uniqueSuffix + ext);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /pdf|doc|docx|xls|xlsx|ppt|pptx|txt|png|jpg|jpeg|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype) || file.mimetype.includes('image');
    if (extname || mimetype) {
      return cb(null, true);
    }
    cb(new Error('Invalid file type'));
  }
});

const router = express.Router();

// Document requests
router.get("/documents/requests", requireAuth, requirePermission(["DOC_APPROVE"]), documentController.getDocumentRequests);
router.put("/documents/requests/:id", requireAuth, requirePermission(["DOC_APPROVE"]), documentController.updateDocumentRequest);
router.post("/documents/requests/:id/revoke", requireAuth, requirePermission(["DOC_APPROVE"]), documentController.revokeDocumentRequest);
router.post("/documents/:id/request", requireAuth, documentController.createDocumentRequest);
router.get("/documents/requests/my", requireAuth, documentController.getMyRequests);

// All document routes require authentication
router.get("/documents", requireAuth, documentController.getAllDocuments);
router.get("/documents/:id", requireAuth, documentController.getDocumentById);

// Upload file — MẶC ĐỊNH MÃ HÓA AES-256
// Mọi file upload đều được tự động mã hóa trước khi lưu trữ
router.post("/documents/upload", requireAuth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    // Tự động mã hóa file bằng Envelope Encryption + Sinh Hash
    const { encryptFile } = await import('../utils/encryption.js');
    const encryptedFilename = `encrypted_${req.file.filename}`;
    const encryptedPath = path.join(uploadsDir, encryptedFilename);

    // Metadata chứa dataKey(bị mã hóa), iv, authTag, fileHash
    const encryptionMetadata = await encryptFile(req.file.path, encryptedPath);

    // Xóa file gốc (không mã hóa) ngay lập tức — hacker không thể đọc
    fs.unlinkSync(req.file.path);

    console.log(`[ENCRYPT] File encrypted: ${req.file.originalname} -> ${encryptedFilename}`);

    res.json({
      filename: encryptedFilename,
      originalName: req.file.originalname,
      url: `/uploads/documents/${encryptedFilename}`,
      fileSize: fs.statSync(encryptedPath).size,
      fileType: path.extname(req.file.originalname).slice(1).toUpperCase(),
      encrypted: true,
      algorithm: 'AES-256-GCM',
      encryptionMetadata // Gửi metadata về để lúc Submit tạo Document gửi lên lại
    });
  } catch (err) {
    console.error('[UPLOAD ERROR]', err);
    res.status(500).json({ message: err.message });
  }
});

// Create document (with or without file)
router.post("/documents", requireAuth, requirePermission(["DOC_UPLOAD"]), documentController.createDocument);

// Update - ADMIN/MANAGER can update any, STAFF can update own draft
router.put("/documents/:id", requireAuth, documentController.updateDocument);

// Upload new version — MẶC ĐỊNH MÃ HÓA
router.post("/documents/:id/upload", requireAuth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    // Tự động mã hóa file sau khi upload (Envelope Encryption)
    const { encryptFile } = await import('../utils/encryption.js');
    const encryptedFilename = `encrypted_${req.file.filename}`;
    const encryptedPath = path.join(uploadsDir, encryptedFilename);
    const encryptionMetadata = await encryptFile(req.file.path, encryptedPath);

    // Xóa file gốc ngay lập tức
    fs.unlinkSync(req.file.path);

    res.json({
      filename: encryptedFilename,
      originalName: req.file.originalname,
      url: `/uploads/documents/${encryptedFilename}`,
      fileSize: fs.statSync(encryptedPath).size,
      fileType: path.extname(req.file.originalname).slice(1).toUpperCase(),
      encrypted: true,
      algorithm: 'AES-256-GCM',
      encryptionMetadata
    });
  } catch (err) {
    console.error('[UPLOAD VERSION ERROR]', err);
    res.status(500).json({ message: err.message });
  }
});

// Delete - ADMIN/MANAGER
router.delete("/documents/:id", requireAuth, requirePermission(["DOC_DELETE"]), documentController.deleteDocument);

// Approval workflow - ADMIN/MANAGER only
router.post("/documents/:id/approve", requireAuth, requirePermission(["DOC_APPROVE"]), documentController.approveDocument);
router.post("/documents/:id/reject", requireAuth, requirePermission(["DOC_APPROVE"]), documentController.rejectDocument);

// Download tracking
router.get("/documents/:id/download", requireAuth, documentController.downloadDocument);

// Statistics - ADMIN/MANAGER
router.get("/documents-stats/stats", requireAuth, requirePermission(["DOC_VIEW"]), documentController.getDocumentStats);

// Password protection - ADMIN only
router.post("/documents/:id/password", requireAuth, requirePermission(["DOC_EDIT"]), documentController.setDocumentPassword);
router.post("/documents/:id/lock", requireAuth, requirePermission(["DOC_EDIT"]), documentController.toggleDocumentLock);
router.post("/documents/:id/reset-access", requireAuth, requirePermission(["DOC_EDIT"]), documentController.resetDocumentAccess);

// Verify password for document access
router.post("/documents/:id/verify", requireAuth, documentController.verifyDocumentPassword);

// === NEW SECURITY FEATURES ===

// MFA for sensitive document actions
router.post("/documents/sensitive-action/verify", requireAuth, documentController.verifySensitiveActionMFA);

// Rate limit stats (Admin)
router.get("/documents/rate-limit/stats", requireAuth, requirePermission(["AUDIT_VIEW"]), documentController.getDownloadRateLimitStats);
router.post("/documents/rate-limit/reset", requireAuth, requirePermission(["ZT_MANAGE"]), documentController.resetDownloadRateLimitAdmin);

// Encrypted file upload
router.post("/documents/upload/encrypted", requireAuth, requirePermission(["DOC_UPLOAD"]), upload.single('file'), documentController.encryptUploadedFile);

// Encrypted download (decrypts on-the-fly)
router.get("/documents/:id/download/encrypted", requireAuth, documentController.decryptAndDownload);

// === NEW ADVANCED SECURITY ===

// Watermarked download
router.get("/documents/:id/download/watermarked", requireAuth, documentController.downloadWatermarkedDocument);

// Secure streaming
router.get("/documents/:id/stream", requireAuth, documentController.streamDocumentSecure);

// Secure download link (create)
router.post("/documents/secure-link", requireAuth, documentController.createSecureDownloadLink);

// Secure download with token
router.get("/documents/secure-download", documentController.secureDownloadWithToken);

// Verify leaked document
router.post("/documents/verify-leak", requireAuth, requirePermission(["AUDIT_VIEW"]), documentController.verifyLeakedDocument);

// Emergency lock status
router.get("/documents/emergency-status", requireAuth, documentController.getEmergencyStatus);

export default router;
