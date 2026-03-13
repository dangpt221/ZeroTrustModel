import express from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
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
router.get("/documents/requests", requireAuth, requireRole(["ADMIN", "MANAGER"]), documentController.getDocumentRequests);
router.put("/documents/requests/:id", requireAuth, requireRole(["ADMIN", "MANAGER"]), documentController.updateDocumentRequest);

// All document routes require authentication
router.get("/documents", requireAuth, documentController.getAllDocuments);
router.get("/documents/:id", requireAuth, documentController.getDocumentById);

// Upload file first, then create document
router.post("/documents/upload", requireAuth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    // Return file info for creating document
    res.json({
      filename: req.file.filename,
      originalName: req.file.originalname,
      url: `/uploads/documents/${req.file.filename}`,
      fileSize: req.file.size,
      fileType: path.extname(req.file.originalname).slice(1).toUpperCase()
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create document (with or without file)
router.post("/documents", requireAuth, requireRole(["ADMIN", "MANAGER", "STAFF"]), documentController.createDocument);

// Update - ADMIN/MANAGER can update any, STAFF can update own draft
router.put("/documents/:id", requireAuth, documentController.updateDocument);

// Upload new version
router.post("/documents/:id/upload", requireAuth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    res.json({
      filename: req.file.filename,
      originalName: req.file.originalname,
      url: `/uploads/documents/${req.file.filename}`,
      fileSize: req.file.size,
      fileType: path.extname(req.file.originalname).slice(1).toUpperCase()
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Delete - ADMIN/MANAGER
router.delete("/documents/:id", requireAuth, requireRole(["ADMIN", "MANAGER"]), documentController.deleteDocument);

// Approval workflow - ADMIN/MANAGER only
router.post("/documents/:id/approve", requireAuth, requireRole(["ADMIN", "MANAGER"]), documentController.approveDocument);
router.post("/documents/:id/reject", requireAuth, requireRole(["ADMIN", "MANAGER"]), documentController.rejectDocument);

// Download tracking
router.get("/documents/:id/download", requireAuth, documentController.downloadDocument);

// Statistics - ADMIN/MANAGER
router.get("/documents-stats/stats", requireAuth, requireRole(["ADMIN", "MANAGER"]), documentController.getDocumentStats);

// Password protection - ADMIN only
router.post("/documents/:id/password", requireAuth, requireRole(["ADMIN"]), documentController.setDocumentPassword);
router.post("/documents/:id/lock", requireAuth, requireRole(["ADMIN"]), documentController.toggleDocumentLock);

// Verify password for document access
router.post("/documents/:id/verify", requireAuth, documentController.verifyDocumentPassword);

export default router;
