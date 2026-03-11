import { Document } from "../models/Document.js";
import { User } from "../models/User.js";
import { Department } from "../models/Department.js";
import { AuditLog } from "../models/AuditLog.js";
import { DocumentRequest } from "../models/DocumentRequest.js";

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

    // Search
    if (search) {
      query.$text = { $search: search };
    }

    // Filters
    if (department) query.departmentId = department;
    if (project) query.projectId = project;
    if (status) query.status = status;
    if (classification) query.classification = classification;
    if (sensitivity) query.sensitivity = sensitivity;

    // Role-based filtering - Manager sees all documents (like Admin)
    const userRole = req.user.role;
    const userId = req.user.id;
    const userDeptId = req.user.departmentId;

    console.log('[getAllDocuments] User:', req.user.email, 'Role:', userRole, 'DeptId:', userDeptId);

    // ADMIN and MANAGER see all documents
    // STAFF see their own documents and department documents
    if (userRole === 'STAFF') {
      // Staff can see: own documents, department documents, or project docs
      query.$or = [
        { ownerId: userId },
        { departmentId: userDeptId },
        { projectId: { $exists: true } }
      ];
    }
    // ADMIN and MANAGER see all - no additional filtering needed

    const skip = (parseInt(page) - 1) * parseInt(limit);

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
        ip: req.ip,
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
      ip: req.ip,
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
      ip: req.ip,
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
      ip: req.ip,
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
      ip: req.ip,
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
      ip: req.ip,
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

    const doc = await Document.findById(id);
    if (!doc || doc.isDeleted) {
      return res.status(404).json({ message: "Document not found" });
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
      ip: req.ip,
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
