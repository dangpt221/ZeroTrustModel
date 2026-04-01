import { Document } from "../models/Document.js";
import { User } from "../models/User.js";
import { Department } from "../models/Department.js";
import { AuditLog } from "../models/AuditLog.js";
import { DocumentRequest } from "../models/DocumentRequest.js";
import { getClientIP, parseDeviceFromUserAgent } from "../middleware/securityMiddleware.js";
import { checkDRMPermission, logDRMAction, DRM_ACTIONS } from "../utils/drm.js";
import { checkDownloadRateLimit, recordDownload, getDownloadStats, resetDownloadRateLimit, getAllRateLimitStatus } from "../utils/downloadRateLimiter.js";
import { verifyMFAForAction } from "../utils/sensitiveActionMFA.js";
import { generateWatermarkData, logWatermarkedDownload } from "../utils/forensicWatermark.js";
import { generateDocumentFingerprint, saveFingerprint } from "../utils/documentFingerprint.js";
import { streamSecureDocument, streamWatermarkedPDF } from "../utils/secureStreaming.js";
import { checkAnomalyAndAutoLock } from "../utils/anomalyDetection.js";
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";

// Helper: Transform document to client format
function toClientDoc(doc, includeAudit = false) {
  const result = {
    id: doc._id.toString(),
    title: doc.title,
    description: doc.description,
    departmentId: doc.departmentId?.toString(),
    projectId: doc.projectId?.toString(),
    ownerId: doc.ownerId?.toString(),
    classification: doc.classification || 'INTERNAL',
    securityLevel: doc.securityLevel || 1,
    sensitivity: doc.sensitivity || 'LOW',
    currentVersion: doc.currentVersion || 1,
    fileSize: doc.fileSize || '',
    fileType: doc.fileType || 'PDF',
    url: doc.url || '',
    status: doc.status || 'DRAFT',
    approvedBy: doc.approvedBy?.toString(),
    approvedAt: doc.approvedAt,
    rejectionReason: doc.rejectionReason || '',
    tags: doc.tags || [],
    isDeleted: doc.isDeleted || false,
    isPasswordProtected: doc.isPasswordProtected || false,
    isLocked: doc.isLocked || false,
    lockedAt: doc.lockedAt,
    viewedBy: doc.viewedBy?.map(id => id.toString()) || [],
    downloadedBy: doc.downloadedBy?.map(id => id.toString()) || [],
    lastViewedAt: doc.lastViewedAt,
    lastDownloadedAt: doc.lastDownloadedAt,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };

  if (includeAudit) {
    result.versions = doc.versions?.map(v => ({
      version: v.version,
      url: v.url,
      fileSize: v.fileSize,
      fileType: v.fileType,
      uploadedBy: v.uploadedBy?.toString(),
      uploadedAt: v.uploadedAt,
      changes: v.changes
    })) || [];
  }

  return result;
}

// Get all documents with filters
export const getAllDocuments = async (req, res, next) => {
  try {
    console.log('[getAllDocuments] Called - User:', req.user?.email, 'Role:', req.user?.role);

    const {
      search,
      department,
      project,
      status,
      classification,
      sensitivity,
      page = 1,
      limit = 20
    } = req.query;

    const query = { isDeleted: { $ne: true } };

    // Search - remove text search if no index
    // if (search) {
    //   query.$text = { $search: search };
    // }

    // Filters
    if (department) query.departmentId = department;
    if (project) query.projectId = project;
    if (status) query.status = status;
    if (classification) query.classification = classification;
    if (sensitivity) query.sensitivity = sensitivity;

    // Role-based filtering
    // ADMIN: sees all documents
    // MANAGER: sees only their department's documents
    // STAFF: sees own documents + department documents + project documents
    const userRole = req.user.role;
    const userId = req.user.id;
    const userDeptId = req.user.departmentId;

    // Role-based filtering ENFORCED for Zero Trust
    // ADMIN: sees all documents
    // MANAGER/STAFF: sees only their department's documents or project items
    if (userRole !== 'ADMIN') {
      const orConditions = [];

      // If user has a department, they see departmental docs
      if (userDeptId) {
        orConditions.push({ departmentId: userDeptId });
      }

      // They also see Common documents (no department)
      orConditions.push({ departmentId: null });

      // They see documents they own
      orConditions.push({ ownerId: userId });

      query.$or = orConditions;

      // SPECIFIC RESTRICTION: STAFF cannot see HIGH/CRITICAL sensitivity + High security level documents
      if (userRole === 'STAFF') {
        query.$and = query.$and || [];
        query.$and.push({
          $or: [
            { sensitivity: { $nin: ['HIGH', 'CRITICAL'] } },
            { securityLevel: { $lt: 3 } }
          ]
        });
      }
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    console.log('[getAllDocuments] Query:', JSON.stringify(query));

    const [documents, total] = await Promise.all([
      Document.find(query)
        .populate('departmentId', 'name')
        .populate('ownerId', 'name email')
        .populate('projectId', 'title')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Document.countDocuments(query)
    ]);

    console.log('[getAllDocuments] Found:', documents.length, 'Total:', total);

    res.json({
      documents: documents.map(d => ({
        ...toClientDoc(d),
        departmentName: d.departmentId?.name,
        ownerName: d.ownerId?.name,
        projectTitle: d.projectId?.title,
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (err) {
    next(err);
  }
};

// Get document by ID
export const getDocumentById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    const doc = await Document.findById(id)
      .populate('departmentId', 'name')
      .populate('ownerId', 'name email')
      .populate('projectId', 'title')
      .populate('approvedBy', 'name')
      .lean();

    if (!doc) return res.status(404).json({ message: "Document not found" });
    if (doc.isDeleted) return res.status(404).json({ message: "Document not found" });

    // Security clearance level constraint has been removed 
    // to allow any user to view any document natively unless it is specifically locked by an admin.

    // Check if document is locked by admin (non-admin users need an approved request)
    if (doc.isLocked && userRole !== 'ADMIN') {
      const approvedRequest = await DocumentRequest.findOne({
        documentId: id,
        userId: userId,
        status: 'APPROVED',
      }).lean();

      if (!approvedRequest) {
        return res.status(403).json({
          message: "Document is locked by admin",
          isLocked: true,
          lockedAt: doc.lockedAt,
          lockedBy: doc.lockedBy,
          requiresRequest: true
        });
      }
    }

    // SPECIFIC RESTRICTION: STAFF cannot access HIGH/CRITICAL sensitivity + High security level documents
    if (userRole === 'STAFF' && ['HIGH', 'CRITICAL'].includes(doc.sensitivity) && doc.securityLevel >= 3) {
      return res.status(403).json({
        message: "You do not have sufficient clearance to view this high-security document.",
        requiresElevatedPrivileges: true
      });
    }

    // Check if password protected and user is not admin
    if (doc.isPasswordProtected && userRole !== 'ADMIN') {
      // Return limited info without the actual document content
      return res.json({
        id: doc._id.toString(),
        title: doc.title,
        description: doc.description,
        departmentId: doc.departmentId?.toString(),
        projectId: doc.projectId?.toString(),
        ownerId: doc.ownerId?.toString(),
        classification: doc.classification,
        securityLevel: doc.securityLevel,
        sensitivity: doc.sensitivity,
        status: doc.status,
        tags: doc.tags,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
        isPasswordProtected: true,
        requiresPassword: true,
        isLocked: false,
        drm: { enabled: true, requiresPassword: true },
      });
    }

    // Track view
    if (!doc.viewedBy?.includes(userId)) {
      await Document.findByIdAndUpdate(id, {
        $addToSet: { viewedBy: userId },
        lastViewedAt: new Date()
      });

      // Log audit
      await AuditLog.create({
        userId,
        userName: req.user.name,
        action: 'DOCUMENT_VIEW',
        details: `Viewed document: ${doc.title}`,
        ip: getClientIP(req),
        device: parseDeviceFromUserAgent(req.headers['user-agent']),
        status: 'SUCCESS',
        riskLevel: 'LOW'
      });
    }

    // === DRM PROTECTION ===
    const drmDoc = wrapWithDRM(doc, req.user);
    const drmPermission = checkDRMPermission(doc, req.user, DRM_ACTIONS.VIEW);
    await logDRMAction(req, doc, DRM_ACTIONS.VIEW, drmPermission.allowed, drmPermission.reason);

    const result = toClientDoc(drmDoc, true);
    result.drm = {
      enabled: true,
      policy: drmPermission.policy,
      classification: doc.classification,
      securityLevel: doc.securityLevel,
      watermark: drmPermission.policy.watermark,
      expiresAt: drmPermission.policy.expiresAt,
    };

    res.json(result);
  } catch (err) {
    next(err);
  }
};

// Create document
export const createDocument = async (req, res, next) => {
  try {
    const {
      title,
      description,
      departmentId,
      projectId,
      classification,
      securityLevel,
      sensitivity,
      tags,
      url,
      fileSize,
      fileType,
      status,
      encryptionMetadata
    } = req.body;

    const ownerId = req.user.id;
    const userRole = req.user.role;

    // Staff can only create DRAFT
    let docStatus = status || 'DRAFT';
    if (userRole === 'STAFF') {
      docStatus = 'DRAFT';
    }

    // AUTO-LOCK: High security + High/Critical sensitivity = Automatically Lock and require Admin approval
    const shouldAutoLock = ['HIGH', 'CRITICAL'].includes(sensitivity) && Number(securityLevel) >= 3;
    const isLocked = shouldAutoLock ? true : false;
    const lockedAt = shouldAutoLock ? new Date() : null;
    const lockedBy = shouldAutoLock ? ownerId : null; // System-locked by owner ID attribute

    const doc = await Document.create({
      title,
      description,
      departmentId,
      projectId,
      ownerId,
      classification: classification || 'INTERNAL',
      securityLevel: securityLevel || 1,
      sensitivity: sensitivity || 'LOW',
      tags: tags || [],
      url: url || '',
      fileSize: fileSize || '',
      fileType: fileType || 'PDF',
      status: docStatus,
      isLocked,
      lockedAt,
      lockedBy,
      encryptionMetadata,
      currentVersion: 1,
      versions: [{
        version: 1,
        url: url || '',
        fileSize,
        fileType,
        uploadedBy: ownerId,
        uploadedAt: new Date(),
        changes: 'Initial version',
        encryptionMetadata
      }]
    });

    // Audit log
    await AuditLog.create({
      userId: ownerId,
      userName: req.user.name,
      action: 'DOCUMENT_CREATE',
      details: `Created document: ${title}`,
      ip: getClientIP(req),
      device: parseDeviceFromUserAgent(req.headers['user-agent']),
      status: 'SUCCESS',
      riskLevel: 'LOW'
    });

    res.status(201).json(toClientDoc(doc));
  } catch (err) {
    next(err);
  }
};

// Update document
export const updateDocument = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      departmentId,
      projectId,
      classification,
      securityLevel,
      sensitivity,
      tags,
      url,
      fileSize,
      fileType,
      changes,
      encryptionMetadata
    } = req.body;

    const userId = req.user.id;
    const userRole = req.user.role;

    const doc = await Document.findById(id);
    if (!doc) return res.status(404).json({ message: "Document not found" });
    if (doc.isDeleted) return res.status(404).json({ message: "Document not found" });

    // Check ownership or admin
    const isOwner = doc.ownerId?.toString() === userId;
    const isAdmin = userRole === 'ADMIN';
    const isManager = userRole === 'MANAGER';

    // Staff can only edit their own DRAFT documents
    if (userRole === 'STAFF') {
      if (!isOwner || doc.status !== 'DRAFT') {
        return res.status(403).json({ message: "You can only edit your own draft documents" });
      }
    }

    // Update fields
    if (title) doc.title = title;
    if (description !== undefined) doc.description = description;
    if (departmentId) doc.departmentId = departmentId;
    if (projectId) doc.projectId = projectId;
    if (classification) doc.classification = classification;
    if (securityLevel) doc.securityLevel = securityLevel;
    if (sensitivity) doc.sensitivity = sensitivity;
    if (tags) doc.tags = tags;

    // AUTO-LOCK CHECK on update
    const shouldNowBeLocked = ['HIGH', 'CRITICAL'].includes(doc.sensitivity) && Number(doc.securityLevel) >= 3;
    if (shouldNowBeLocked && !doc.isLocked) {
      doc.isLocked = true;
      doc.lockedAt = new Date();
      doc.lockedBy = userId;
    }

    // New version if file changed
    if (url && url !== doc.url) {
      doc.currentVersion += 1;
      doc.url = url;
      doc.fileSize = fileSize || doc.fileSize;
      doc.fileType = fileType || doc.fileType;
      if (encryptionMetadata) {
        doc.encryptionMetadata = encryptionMetadata;
      }
      doc.versions.push({
        version: doc.currentVersion,
        url,
        fileSize,
        fileType,
        uploadedBy: userId,
        uploadedAt: new Date(),
        changes: changes || 'Updated file',
        encryptionMetadata: encryptionMetadata || doc.encryptionMetadata
      });
    }

    await doc.save();

    // Audit log
    await AuditLog.create({
      userId,
      userName: req.user.name,
      action: 'DOCUMENT_UPDATE',
      details: `Updated document: ${doc.title}`,
      ip: getClientIP(req),
      device: parseDeviceFromUserAgent(req.headers['user-agent']),
      status: 'SUCCESS',
      riskLevel: 'LOW'
    });

    res.json(toClientDoc(doc));
  } catch (err) {
    next(err);
  }
};

// Delete document (soft delete)
export const deleteDocument = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    const doc = await Document.findById(id);
    if (!doc) return res.status(404).json({ message: "Document not found" });

    // Check permission
    const isOwner = doc.ownerId?.toString() === userId;
    const isAdmin = userRole === 'ADMIN';

    // Staff can only delete their own DRAFT
    if (userRole === 'STAFF') {
      if (!isOwner || doc.status !== 'DRAFT') {
        return res.status(403).json({ message: "You can only delete your own draft documents" });
      }
    }

    // Manager can delete any department docs
    if (userRole === 'MANAGER') {
      // Allow Manager to delete any document
    }

    // Soft delete (use updateOne to bypass validation)
    await Document.updateOne(
      { _id: id },
      { isDeleted: true, deletedAt: new Date() }
    );

    // Audit log
    await AuditLog.create({
      userId,
      userName: req.user.name,
      action: 'DOCUMENT_DELETE',
      details: `Deleted document: ${doc.title || doc.name || id}`,
      ip: getClientIP(req),
      device: parseDeviceFromUserAgent(req.headers['user-agent']),
      status: 'SUCCESS',
      riskLevel: 'MEDIUM'
    });

    res.json({ success: true, message: "Document deleted" });
  } catch (err) {
    next(err);
  }
};

// Approve document
export const approveDocument = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Only MANAGER, ADMIN can approve
    if (!['ADMIN', 'MANAGER'].includes(userRole)) {
      return res.status(403).json({ message: "You don't have permission to approve documents" });
    }

    const doc = await Document.findById(id);
    if (!doc) return res.status(404).json({ message: "Document not found" });

    if (doc.status !== 'PENDING') {
      return res.status(400).json({ message: "Document is not pending approval" });
    }

    doc.status = 'APPROVED';
    doc.approvedBy = userId;
    doc.approvedAt = new Date();
    await doc.save();

    // Audit log
    await AuditLog.create({
      userId,
      userName: req.user.name,
      action: 'DOCUMENT_APPROVE',
      details: `Approved document: ${doc.title}`,
      ip: getClientIP(req),
      device: parseDeviceFromUserAgent(req.headers['user-agent']),
      status: 'SUCCESS',
      riskLevel: 'MEDIUM'
    });

    res.json(toClientDoc(doc));
  } catch (err) {
    next(err);
  }
};

// Reject document
export const rejectDocument = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    if (!['ADMIN', 'MANAGER'].includes(userRole)) {
      return res.status(403).json({ message: "You don't have permission to reject documents" });
    }

    const doc = await Document.findById(id);
    if (!doc) return res.status(404).json({ message: "Document not found" });

    doc.status = 'REJECTED';
    doc.rejectionReason = reason || '';
    await doc.save();

    // Audit log
    await AuditLog.create({
      userId,
      userName: req.user.name,
      action: 'DOCUMENT_REJECT',
      details: `Rejected document: ${doc.title}. Reason: ${reason || 'None'}`,
      ip: getClientIP(req),
      device: parseDeviceFromUserAgent(req.headers['user-agent']),
      status: 'SUCCESS',
      riskLevel: 'MEDIUM'
    });

    res.json(toClientDoc(doc));
  } catch (err) {
    next(err);
  }
};

// Download document (track + DRM + Rate Limit + Encryption)
export const downloadDocument = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;
    const userIp = getClientIP(req);

    // === TUYỆT ĐỐI CẤM TẢI FILE — KHÔNG AI ĐƯỢC TẢI (ZeroTrust: never trust, always verify) ===
    // Kể cả ADMIN — hacker đánh cắp tài khoản admin cũng không tải được file
    // Tất cả chỉ xem qua SECURE STREAMING có watermark
    return res.status(403).json({
      message: 'Tải file về máy bị cấm tuyệt đối. Tất cả tài liệu chỉ được xem qua chế độ streaming an toàn có watermark.',
      mode: 'STREAMING_ONLY',
      hint: 'Sử dụng chế độ xem trực tuyến để xem tài liệu với bảo vệ watermark.'
    });

    // === RATE LIMIT CHECK ===
    const rateLimitCheck = checkDownloadRateLimit(userId, userIp);
    res.setHeader('X-RateLimit-Limit', '10');
    res.setHeader('X-RateLimit-Remaining', rateLimitCheck.remaining);

    if (rateLimitCheck.blocked) {
      res.setHeader('Retry-After', rateLimitCheck.retryAfter);
      await AuditLog.create({
        userId,
        userName: req.user.name,
        action: 'RATE_LIMIT_BLOCKED',
        details: `Download blocked: rate limit exceeded`,
        ip: userIp,
        device: parseDeviceFromUserAgent(req.headers['user-agent']),
        status: 'BLOCKED',
        riskLevel: 'HIGH',
        metadata: { documentId: id },
      });
      return res.status(429).json({
        message: rateLimitCheck.reason,
        rateLimit: { blocked: true, retryAfter: rateLimitCheck.retryAfter },
      });
    }

    const doc = await Document.findById(id);
    if (!doc || doc.isDeleted) {
      return res.status(404).json({ message: "Document not found" });
    }

    // Check if document is locked by admin
    if (doc.isLocked && userRole !== 'ADMIN') {
      return res.status(403).json({ message: "Document is locked by admin" });
    }

    // Check if password protected and user is not admin
    if (doc.isPasswordProtected && userRole !== 'ADMIN') {
      return res.status(403).json({ message: "Document requires password", requiresPassword: true });
    }

    // === DRM CHECK ===
    const drmPermission = checkDRMPermission(doc, req.user, DRM_ACTIONS.DOWNLOAD);
    await logDRMAction(req, doc, DRM_ACTIONS.DOWNLOAD, drmPermission.allowed, drmPermission.reason);

    if (!drmPermission.allowed) {
      return res.status(403).json({
        message: drmPermission.reason,
        drm: { enabled: true, action: DRM_ACTIONS.DOWNLOAD, denied: true },
      });
    }

    // Track download
    if (!doc.downloadedBy?.includes(userId)) {
      await Document.findByIdAndUpdate(id, {
        $addToSet: { downloadedBy: userId },
        lastDownloadedAt: new Date()
      });
    }

    // Audit log
    await AuditLog.create({
      userId,
      userName: req.user.name,
      action: 'DOCUMENT_DOWNLOAD',
      details: `Downloaded document: ${doc.title}`,
      ip: userIp,
      device: parseDeviceFromUserAgent(req.headers['user-agent']),
      status: 'SUCCESS',
      riskLevel: 'MEDIUM',
      metadata: {
        documentId: id,
        classification: doc.classification,
        securityLevel: doc.securityLevel,
        drmPolicy: drmPermission.policy,
      },
    });

    // === RECORD DOWNLOAD FOR RATE LIMITING ===
    recordDownload(userId, userIp, id, doc.title);

    // Return download URL — MẶC ĐỊNH trỏ đến encrypted version
    // File đã được mã hóa AES-256, client phải gọi /download/encrypted để giải mã
    const isEncrypted = doc.url && doc.url.startsWith('/uploads/documents/encrypted_');

    // TÀI LIỆU NHẠY CẢM: CONFIDENTIAL/CRITICAL bắt buộc phải xem qua SECURE STREAMING
    // Không cho tải file về máy — chỉ xem trực tuyến có watermark
    const isSensitive = doc.sensitivity === 'CRITICAL' || doc.classification === 'CONFIDENTIAL';

    res.json({
      url: isSensitive
        ? `/api/documents/${id}/stream`
        : (isEncrypted
          ? `/api/documents/${id}/download/encrypted`
          : doc.url),
      fileName: `${doc.title}_v${doc.currentVersion}.${doc.fileType}`,
      mode: isSensitive ? 'STREAMING_ONLY' : 'DOWNLOAD',
      drm: {
        enabled: true,
        policy: drmPermission.policy,
        watermark: drmPermission.policy.watermark,
        printLimit: drmPermission.policy.printLimit,
        expiresAt: drmPermission.policy.expiresAt,
      },
      rateLimit: {
        remaining: rateLimitCheck.remaining - 1,
        windowResetsAt: rateLimitCheck.windowResetsAt,
      },
    });
  } catch (err) {
    next(err);
  }
};

// Get document statistics
export const getDocumentStats = async (req, res, next) => {
  try {
    const userRole = req.user.role;
    const userDeptId = req.user.departmentId;

    let query = { isDeleted: { $ne: true } };

    if (userRole === 'MANAGER' && userDeptId) {
      query.departmentId = userDeptId;
    }

    const [stats, byStatus, byClassification] = await Promise.all([
      Document.countDocuments(query),
      Document.aggregate([
        { $match: query },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      Document.aggregate([
        { $match: query },
        { $group: { _id: '$classification', count: { $sum: 1 } } }
      ])
    ]);

    res.json({
      total: stats,
      byStatus: byStatus.reduce((acc, curr) => {
        acc[curr._id] = curr.count;
        return acc;
      }, {}),
      byClassification: byClassification.reduce((acc, curr) => {
        acc[curr._id] = curr.count;
        return acc;
      }, {})
    });
  } catch (err) {
    next(err);
  }
};

// Get all document requests
export const getDocumentRequests = async (req, res, next) => {
  try {
    const requests = await DocumentRequest.find()
      .populate('userId', 'name email avatar')
      .populate('documentId', 'title name')
      .sort({ createdAt: -1 })
      .lean();
    res.json(requests.map(req => ({
      ...req,
      id: req._id.toString(),
      // Keep userId/documentId as objects for name display,
      // but ensure properties like .toString() for ID compatibility if needed
    })));
  } catch (err) {
    next(err);
  }
};

// Staff/Manager: Create request to access document
export const createDocumentRequest = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const document = await Document.findById(id);
    if (!document) {
      return res.status(404).json({ message: "Document not found" });
    }

    // Check if user already has a pending request
    const existingRequest = await DocumentRequest.findOne({
      documentId: id,
      userId: req.user.id,
      status: 'PENDING'
    });

    if (existingRequest) {
      return res.status(400).json({ message: "Bạn đã có yêu cầu đang chờ duyệt" });
    }

    const request = new DocumentRequest({
      documentId: id,
      userId: req.user.id,
      reason: reason || 'Yêu cầu xem tài liệu'
    });

    await request.save();

    res.status(201).json({ message: "Yêu cầu đã được gửi", request });
  } catch (err) {
    next(err);
  }
};

// Staff/Manager: Get my requests
export const getMyRequests = async (req, res, next) => {
  try {
    const requests = await DocumentRequest.find({ userId: req.user.id })
      .populate('documentId', 'title name')
      .sort({ createdAt: -1 })
      .lean();
    res.json(requests);
  } catch (err) {
    next(err);
  }
};

// Update document request status
export const updateDocumentRequest = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, reason } = req.body;

    const request = await DocumentRequest.findByIdAndUpdate(
      id,
      {
        status,
        rejectionReason: reason,
        reviewedAt: new Date(),
        reviewedBy: req.user.id
      },
      { new: true }
    );

    if (!request) {
      return res.status(404).json({ message: "Request not found" });
    }

    // Populate for frontend display
    await request.populate('userId', 'name email');
    await request.populate('documentId', 'title name');

    res.json(request);
  } catch (err) {
    next(err);
  }
};

// Admin: Revoke document access (set status back to PENDING)
export const revokeDocumentRequest = async (req, res, next) => {
  try {
    const { id } = req.params;

    const request = await DocumentRequest.findByIdAndUpdate(
      id,
      {
        status: 'PENDING',
        rejectionReason: 'Quyền truy cập đã bị thu hồi',
        reviewedAt: new Date(),
        reviewedBy: req.user.id
      },
      { new: true }
    ).populate('userId', 'name email').populate('documentId', 'title name');

    if (!request) {
      return res.status(404).json({ message: "Yêu cầu không tồn tại" });
    }

    res.json({ message: "Đã thu hồi quyền truy cập", request });
  } catch (err) {
    next(err);
  }
};

// Admin: Set password for document (for MEDIUM/HIGH security)
export const setDocumentPassword = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { password } = req.body;

    const document = await Document.findById(id);
    if (!document) {
      return res.status(404).json({ message: "Document not found" });
    }

    // Only admin can set password
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ message: "Only admin can set document password" });
    }

    // Security level must be 2 or 3 to require password
    if (document.securityLevel < 2) {
      return res.status(400).json({ message: "Password protection only for MEDIUM (2) or HIGH (3) security level" });
    }

    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      document.password = hashedPassword;
      document.isPasswordProtected = true;
    } else {
      // Remove password protection
      document.password = null;
      document.isPasswordProtected = false;
    }

    await document.save();

    res.json({ message: "Password updated successfully", isPasswordProtected: document.isPasswordProtected });
  } catch (err) {
    next(err);
  }
};

// Admin: Lock/unlock document (completely block access)
export const toggleDocumentLock = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { isLocked } = req.body;

    const document = await Document.findById(id);
    if (!document) {
      return res.status(404).json({ message: "Document not found" });
    }

    // Only admin can lock/unlock
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ message: "Only admin can lock/unlock document" });
    }

    document.isLocked = isLocked;
    document.lockedAt = isLocked ? new Date() : null;
    document.lockedBy = isLocked ? req.user.id : null;

    await document.save();

    res.json({ message: isLocked ? "Document locked successfully" : "Document unlocked successfully", isLocked: document.isLocked });
  } catch (err) {
    next(err);
  }
};

// Admin: Reset failed attempts and unlock document
export const resetDocumentAccess = async (req, res, next) => {
  try {
    const { id } = req.params;

    const document = await Document.findById(id);
    if (!document) {
      return res.status(404).json({ message: "Document not found" });
    }

    // Only admin can reset
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ message: "Only admin can reset document access" });
    }

    // Reset failed attempts and unlock
    document.failedAttempts = 0;
    document.lockedUntil = null;
    await document.save();

    res.json({ message: "Document access reset successfully", failedAttempts: document.failedAttempts });
  } catch (err) {
    next(err);
  }
};

// Verify document password (for MEDIUM/HIGH security documents)
export const verifyDocumentPassword = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { password } = req.body;

    const document = await Document.findById(id);
    if (!document) {
      return res.status(404).json({ message: "Document not found" });
    }

    // Check if document is permanently locked due to too many failed attempts
    if (document.lockedUntil && new Date(document.lockedUntil) > new Date()) {
      return res.status(423).json({
        verified: false,
        locked: true,
        message: "Tài liệu đã bị khóa do nhập sai mật khẩu quá 3 lần. Vui lòng liên hệ Admin để mở khóa.",
        failedAttempts: document.failedAttempts
      });
    }

    // If not password protected and not locked, allow access
    if (!document.isPasswordProtected && !document.isLocked) {
      return res.json({ verified: true });
    }

    // If document requires password verification
    if (document.isPasswordProtected) {
      const isValid = await bcrypt.compare(password, document.password);
      if (!isValid) {
        // Increment failed attempts
        document.failedAttempts = (document.failedAttempts || 0) + 1;

        // Lock permanently after 3 failed attempts
        if (document.failedAttempts >= 3) {
          document.lockedUntil = new Date('2099-12-31'); // Permanent lock
          await document.save();
          return res.status(423).json({
            verified: false,
            locked: true,
            message: "Bạn đã nhập sai quá 3 lần. Tài liệu đã bị khóa vĩnh viễn. Liên hệ Admin để mở khóa.",
            failedAttempts: document.failedAttempts
          });
        }

        await document.save();
        return res.status(401).json({
          verified: false,
          message: "Incorrect password",
          failedAttempts: document.failedAttempts
        });
      }

      // Password correct, reset failed attempts and allow access
      document.failedAttempts = 0;
      document.lockedUntil = null;
      await document.save();

      return res.json({ verified: true, failedAttempts: 0 });
    }

    // If document is locked but not password protected - allow with password
    // This is for documents locked by admin that need password to unlock
    if (document.isLocked && !document.isPasswordProtected) {
      // For locked documents without password, only ADMIN can unlock
      if (req.user.role !== 'ADMIN') {
        return res.status(403).json({ message: "Document is locked by admin. Contact admin for access." });
      }
      return res.json({ verified: true });
    }

    res.json({ verified: true });
  } catch (err) {
    next(err);
  }
};

// === MFA cho hành động nhạy cảm ===
export const verifySensitiveActionMFA = verifyMFAForAction;

// === Rate Limit Admin ===
export const getDownloadRateLimitStats = async (req, res, next) => {
  try {
    const { userId } = req.query;
    const userIp = getClientIP(req);

    if (userId) {
      const stats = getDownloadStats(userId, userIp);
      return res.json({ userId, ...stats });
    }

    // Admin: get all rate-limited users
    const allStatus = getAllRateLimitStatus();
    res.json({ rateLimitedUsers: allStatus });
  } catch (err) {
    next(err);
  }
};

export const resetDownloadRateLimitAdmin = async (req, res, next) => {
  try {
    const { userId, ip } = req.body;
    const result = resetDownloadRateLimit(userId, ip);

    await AuditLog.create({
      userId: req.user.id,
      userName: req.user.name,
      action: 'RATE_LIMIT_RESET',
      details: `Admin reset download rate limit for ${userId || ip}`,
      ip: getClientIP(req),
      device: parseDeviceFromUserAgent(req.headers['user-agent']),
      status: 'SUCCESS',
      riskLevel: 'LOW',
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
};

// === Encryption helpers for file upload ===
export const encryptUploadedFile = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const { encryptFile } = await import('../utils/encryption.js');
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const uploadsDir = path.join(__dirname, '../../uploads/documents');

    const encryptedPath = path.join(uploadsDir, `encrypted_${req.file.filename}`);
    await encryptFile(req.file.path, encryptedPath);

    // Remove original unencrypted file
    fs.unlinkSync(req.file.path);

    const result = {
      filename: `encrypted_${req.file.filename}`,
      originalName: req.file.originalname,
      url: `/uploads/documents/encrypted_${req.file.filename}`,
      fileSize: fs.statSync(encryptedPath).size,
      fileType: path.extname(req.file.originalname).slice(1).toUpperCase(),
      encrypted: true,
      algorithm: 'AES-256-GCM',
    };

    res.json(result);
  } catch (err) {
    next(err);
  }
};

export const decryptAndDownload = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;
    const userIp = getClientIP(req);

    // Rate limit check
    const rateLimitCheck = checkDownloadRateLimit(userId, userIp);
    if (rateLimitCheck.blocked) {
      return res.status(429).json({
        message: rateLimitCheck.reason,
        rateLimit: { blocked: true, retryAfter: rateLimitCheck.retryAfter },
      });
    }

    const doc = await Document.findById(id);
    if (!doc || doc.isDeleted) {
      return res.status(404).json({ message: "Document not found" });
    }

    // TUYỆT ĐỐI CẤM TẢI — Không ai được tải file, kể cả Admin
    // ZeroTrust: hacker đánh cắp admin cũng không lấy được file
    return res.status(403).json({
      message: 'Tải file về máy bị cấm tuyệt đối. Sử dụng chế độ streaming an toàn.',
      mode: 'STREAMING_ONLY',
    });
  } catch (err) {
    next(err);
  }
};

// ============ WATERMARKED DOWNLOAD ============

export const downloadWatermarkedDocument = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userIp = getClientIP(req);

    // Rate limit check
    const rateLimitCheck = checkDownloadRateLimit(userId, userIp);
    res.setHeader('X-RateLimit-Limit', '10');
    res.setHeader('X-RateLimit-Remaining', rateLimitCheck.remaining);

    if (rateLimitCheck.blocked) {
      res.setHeader('Retry-After', rateLimitCheck.retryAfter);
      return res.status(429).json({
        message: rateLimitCheck.reason,
        rateLimit: { blocked: true, retryAfter: rateLimitCheck.retryAfter },
      });
    }

    const doc = await Document.findById(id);
    if (!doc || doc.isDeleted) {
      return res.status(404).json({ message: "Document not found" });
    }

    // TUYỆT ĐỐI CẤM TẢI — Không ai được tải file, kể cả Admin
    // ZeroTrust: hacker đánh cắp admin cũng không lấy được file
    return res.status(403).json({
      message: 'Tải file về máy bị cấm tuyệt đối. Sử dụng chế độ streaming an toàn.',
      mode: 'STREAMING_ONLY',
    });
  } catch (err) {
    next(err);
  }
};

// ============ SECURE STREAMING ============

export const streamDocumentSecure = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;
    const userIp = getClientIP(req);

    // Rate limit check
    const rateLimitCheck = checkDownloadRateLimit(userId, userIp);
    if (rateLimitCheck.blocked) {
      return res.status(429).json({
        message: rateLimitCheck.reason,
        rateLimit: { blocked: true },
      });
    }

    const doc = await Document.findById(id);
    if (!doc || doc.isDeleted) {
      return res.status(404).json({ message: "Document not found" });
    }

    // === KIỂM TRA QUYỀN TRUY CẬP BẮT BUỘC ===
    const isOwner = doc.ownerId?.toString() === userId;
    const isAdmin = userRole === 'ADMIN';

    // === ZERO TRUST BEHAVIOR ANALYSIS (ANOMALY DETECTION) ===
    const anomalyStatus = await checkAnomalyAndAutoLock(userId, doc.sensitivity, userIp, req.headers['user-agent'] || 'Unknown');
    if (anomalyStatus.locked) {
      return res.status(403).json({
        message: anomalyStatus.reason,
        drm: { enabled: true, denied: true }
      });
    }

    // Nếu tài liệu bị khoá, yêu cầu phải có request đã duyệt (trừ admin)
    if (doc.isLocked && !isAdmin) {
      const approvedRequest = await DocumentRequest.findOne({
        documentId: id,
        userId: userId,
        status: 'APPROVED',
      }).lean();

      if (!approvedRequest) {
        return res.status(403).json({
          message: 'Tài liệu đang bị khoá. Vui lòng gửi yêu cầu để Admin duyệt.',
          requiresRequest: true,
          mode: 'STREAMING_ONLY',
        });
      }
    }

    // DRM check for VIEW
    const drmPermission = checkDRMPermission(doc, req.user, DRM_ACTIONS.VIEW);
    await logDRMAction(req, doc, DRM_ACTIONS.VIEW, drmPermission.allowed, drmPermission.reason);

    if (!drmPermission.allowed) {
      return res.status(403).json({
        message: drmPermission.reason,
        drm: { enabled: true, denied: true },
      });
    }

    // Stream document securely with correct content-types
    const result = await streamSecureDocument(req, res, doc, req.user);

    if (result?.error) {
      return res.status(404).json({ message: result.error });
    }

    // Note: response already sent by streamWatermarkedPDF
  } catch (err) {
    next(err);
  }
};

// ============ SECURE DOWNLOAD LINK ============

export const createSecureDownloadLink = async (req, res, next) => {
  // TUYỆT ĐỐI CẤM — Không ai được tạo link tải, kể cả Admin
  return res.status(403).json({
    message: 'Tạo link tải bị cấm tuyệt đối. Không ai được tải file về máy.',
    mode: 'STREAMING_ONLY',
  });
};

export const secureDownloadWithToken = async (req, res, next) => {
  // TUYỆT ĐỐI CẤM — Không ai được tải file qua token, kể cả Admin
  return res.status(403).json({
    message: 'Tải file qua link bị cấm tuyệt đối. Không ai được tải file về máy.',
    mode: 'STREAMING_ONLY',
  });
};

// ============ VERIFY LEAKED DOCUMENT ============

export const verifyLeakedDocument = async (req, res, next) => {
  try {
    const { fingerprint } = req.body;

    if (!fingerprint) {
      return res.status(400).json({ message: 'Missing fingerprint' });
    }

    const { verifyLeakedDocument: verifyFP } = await import('../utils/documentFingerprint.js');
    const result = await verifyFP(fingerprint);

    // Log verification attempt
    await AuditLog.create({
      userId: req.user.id,
      userName: req.user.name,
      action: 'DOCUMENT_LEAK_VERIFICATION',
      details: result.found
        ? `Leaked document verified - Fingerprint matched: ${result.attribution?.userName}`
        : 'Leaked document verification - No match found',
      ip: getClientIP(req),
      device: parseDeviceFromUserAgent(req.headers['user-agent']),
      status: result.found ? 'ALERT' : 'SUCCESS',
      riskLevel: result.found ? 'CRITICAL' : 'LOW',
      metadata: { fingerprint: fingerprint.substring(0, 8), found: result.found },
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
};

// ============ EMBED WATERMARK HELPER ============

function embedWatermarkInPDF(originalBuffer, watermark) {
  const watermarkComment = `%WATERMARK:${Buffer.from(JSON.stringify(watermark.watermarkData)).toString('base64')}\n`;
  const pdfStart = originalBuffer.indexOf('%PDF-');
  if (pdfStart === -1) return originalBuffer;
  const insertPos = pdfStart + 5;
  return Buffer.concat([Buffer.from(watermarkComment), originalBuffer.subarray(insertPos)]);
}

// ============ EMERGENCY LOCK STATUS ============

export const getEmergencyStatus = async (req, res, next) => {
  try {
    const status = getEmergencyLockStatus();
    res.json(status);
  } catch (err) {
    next(err);
  }
};
