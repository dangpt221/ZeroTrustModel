import { Document } from "../models/Document.js";
import { User } from "../models/User.js";
import { Department } from "../models/Department.js";
import { AuditLog } from "../models/AuditLog.js";
import { DocumentRequest } from "../models/DocumentRequest.js";
import { getClientIP, parseDeviceFromUserAgent } from "../middleware/securityMiddleware.js";
import bcrypt from "bcryptjs";

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

    if (userRole === 'MANAGER' && userDeptId) {
      // Manager sees only documents from their department
      const mongoose = await import('mongoose');
      query.departmentId = new mongoose.Types.ObjectId(userDeptId);
      console.log('[getAllDocuments] Manager filtering by department:', userDeptId);
    } else if (userRole === 'STAFF' && userDeptId) {
      // Staff sees: own docs + department docs + project docs
      delete query.departmentId;
      query.$or = [
        { ownerId: userId },
        { departmentId: userDeptId },
        { projectId: { $exists: true } }
      ];
    }
    // ADMIN sees all documents - no additional filtering

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

    // Check permission based on security level
    const userClearance = userRole === 'ADMIN' ? 3 :
      userRole === 'MANAGER' ? 2 : 1;

    if (doc.securityLevel > userClearance) {
      return res.status(403).json({ message: "Insufficient clearance level" });
    }

    // Check if document is locked by admin (non-admin users can't access)
    if (doc.isLocked && userRole !== 'ADMIN') {
      return res.status(403).json({
        message: "Document is locked by admin",
        isLocked: true,
        lockedAt: doc.lockedAt,
        lockedBy: doc.lockedBy
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
        isLocked: false
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

    res.json(toClientDoc(doc, true));
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
      status
    } = req.body;

    const ownerId = req.user.id;
    const userRole = req.user.role;

    // Staff can only create DRAFT
    let docStatus = status || 'DRAFT';
    if (userRole === 'STAFF') {
      docStatus = 'DRAFT';
    }

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
      currentVersion: 1,
      versions: [{
        version: 1,
        url: url || '',
        fileSize,
        fileType,
        uploadedBy: ownerId,
        uploadedAt: new Date(),
        changes: 'Initial version'
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
      changes
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

    // New version if file changed
    if (url && url !== doc.url) {
      doc.currentVersion += 1;
      doc.url = url;
      doc.fileSize = fileSize || doc.fileSize;
      doc.fileType = fileType || doc.fileType;
      doc.versions.push({
        version: doc.currentVersion,
        url,
        fileSize,
        fileType,
        uploadedBy: userId,
        uploadedAt: new Date(),
        changes: changes || 'Updated file'
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

// Download document (track)
export const downloadDocument = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

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
      ip: getClientIP(req),
      device: parseDeviceFromUserAgent(req.headers['user-agent']),
      status: 'SUCCESS',
      riskLevel: 'MEDIUM'
    });

    // Return download URL
    res.json({
      url: doc.url,
      fileName: `${doc.title}_v${doc.currentVersion}.${doc.fileType}`
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
      id: req._id.toString(),
      userId: req.userId?._id?.toString() || req.userId?.toString() || '',
      documentId: req.documentId?._id?.toString() || req.documentId?.toString() || '',
      reason: req.reason,
      status: req.status,
      createdAt: req.createdAt,
      reviewedAt: req.reviewedAt,
      reviewedBy: req.reviewedBy,
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
