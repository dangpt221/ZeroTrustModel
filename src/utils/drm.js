import { Document } from '../models/Document.js';
import { User } from '../models/User.js';
import { AuditLog } from '../models/AuditLog.js';
import { getClientIP, parseDeviceFromUserAgent } from '../middleware/securityMiddleware.js';

/**
 * DRM - Digital Rights Management for Documents
 * Documents are wrapped with DRM metadata and require server-side validation
 */

/**
 * DRM Policy: Define what actions are allowed for a document
 */
export const DRM_ACTIONS = {
  VIEW: 'VIEW',
  DOWNLOAD: 'DOWNLOAD',
  PRINT: 'PRINT',
  COPY: 'COPY',
  EDIT: 'EDIT',
  SHARE: 'SHARE',
  EXPIRE: 'EXPIRE',
};

/**
 * Get DRM policy for a document based on its classification and security level
 * @param {object} document - The document object
 * @param {object} user - The user object
 * @returns {object} - DRM policy with allowed actions
 */
export function getDocumentDRMPolicy(document, user) {
  const classification = document.classification;
  const securityLevel = document.securityLevel;
  const isOwner = document.ownerId?.toString() === user.id;
  const isAdmin = user.role === 'ADMIN';

  let policy = {
    view: true,
    download: true,
    print: true,
    copy: true,
    edit: false,
    share: false,
    expiresAt: null,
    watermark: false,
    offlineAccess: false,
    printLimit: null,
    shareWith: [],
  };

  switch (classification) {
    case 'CONFIDENTIAL':
      policy = {
        view: true,
        download: securityLevel >= 2,
        print: securityLevel >= 3 && !isAdmin,
        copy: false,
        edit: isOwner || isAdmin,
        share: isOwner || isAdmin,
        expiresAt: getDefaultExpiry(securityLevel),
        watermark: securityLevel >= 2,
        offlineAccess: false,
        printLimit: securityLevel >= 3 ? 3 : null,
        shareWith: [],
      };
      break;

    case 'INTERNAL':
      policy = {
        view: true,
        download: true,
        print: true,
        copy: true,
        edit: isOwner || isAdmin,
        share: isOwner || isAdmin,
        expiresAt: null,
        watermark: securityLevel >= 3,
        offlineAccess: true,
        printLimit: null,
        shareWith: [],
      };
      break;

    case 'PUBLIC':
      policy = {
        view: true,
        download: true,
        print: true,
        copy: true,
        edit: isOwner || isAdmin,
        share: true,
        expiresAt: null,
        watermark: false,
        offlineAccess: true,
        printLimit: null,
        shareWith: [],
      };
      break;

    default:
      // RESTRICTED (if added)
      policy = {
        view: false,
        download: false,
        print: false,
        copy: false,
        edit: isAdmin,
        share: isAdmin,
        expiresAt: new Date(),
        watermark: true,
        offlineAccess: false,
        printLimit: 0,
        shareWith: [],
      };
      break;
  }

  // Admin bypasses all restrictions
  if (isAdmin) {
    policy = {
      view: true,
      download: true,
      print: true,
      copy: true,
      edit: true,
      share: true,
      expiresAt: null,
      watermark: false,
      offlineAccess: true,
      printLimit: null,
      shareWith: [],
    };
  }

  // Owner has full access
  if (isOwner && !isAdmin) {
    policy.edit = true;
    policy.share = true;
  }

  return policy;
}

/**
 * Check if a user can perform a specific action on a document
 * @param {object} document - The document object
 * @param {object} user - The user object
 * @param {string} action - The DRM action to check
 * @returns {object} - { allowed, reason }
 */
export function checkDRMPermission(document, user, action) {
  const policy = getDocumentDRMPolicy(document, user);

  // Check expiry
  if (policy.expiresAt && new Date(policy.expiresAt) < new Date()) {
    return {
      allowed: false,
      reason: `Tài liệu đã hết hạn vào ${policy.expiresAt.toLocaleDateString('vi-VN')}`,
      action,
    };
  }

  // Check if user is in share list
  if (policy.shareWith.length > 0 && !policy.shareWith.includes(user.id)) {
    return {
      allowed: false,
      reason: 'Bạn không có quyền truy cập tài liệu này',
      action,
    };
  }

  const allowed = policy[action] === true;
  if (!allowed) {
    const actionLabels = {
      VIEW: 'xem',
      DOWNLOAD: 'tải',
      PRINT: 'in',
      COPY: 'sao chép',
      EDIT: 'chỉnh sửa',
      SHARE: 'chia sẻ',
      EXPIRE: 'truy cập',
    };
    return {
      allowed: false,
      reason: `Bạn không có quyền ${actionLabels[action] || action} tài liệu này`,
      action,
      policy,
    };
  }

  return { allowed: true, policy, action };
}

/**
 * Get default expiry date based on security level
 */
function getDefaultExpiry(securityLevel) {
  const now = new Date();
  switch (securityLevel) {
    case 3: // HIGH
      now.setDate(now.getDate() + 7); // 7 days
      break;
    case 2: // MEDIUM
      now.setDate(now.getDate() + 30); // 30 days
      break;
    default:
      return null;
  }
  return now;
}

/**
 * Wrap document metadata with DRM information
 * @param {object} document - The document object
 * @param {object} user - The user object
 * @returns {object} - Document with DRM metadata
 */
export function wrapWithDRM(document, user) {
  const policy = getDocumentDRMPolicy(document, user);
  const userIp = null; // Will be set by middleware

  return {
    ...document,
    _drm: {
      enabled: true,
      policy,
      issuedAt: new Date().toISOString(),
      issuedTo: {
        userId: user.id,
        email: user.email,
        role: user.role,
      },
      // Digital signature to prevent tampering
      signature: generateDRMSignature(document, user),
    },
  };
}

/**
 * Generate a DRM signature for a document-user pair
 */
function generateDRMSignature(document, user) {
  const crypto = require('crypto');
  const data = `${document._id}:${user.id}:${document.updatedAt}:${Date.now()}`;
  return crypto.createHash('sha256').update(data).digest('hex').substring(0, 32);
}

/**
 * Validate DRM signature when accessing a document
 */
export function validateDRMSignature(document, userId, signature) {
  const expected = generateDRMSignature(document, { id: userId });
  return signature === expected;
}

/**
 * Log DRM action for audit
 */
export async function logDRMAction(req, document, action, allowed, reason = null) {
  await AuditLog.create({
    userId: req.user.id,
    userName: req.user.name,
    action: `DRM_${action}`,
    details: `DRM ${action} on "${document.title}" - ${allowed ? 'ALLOWED' : 'DENIED'}${reason ? `: ${reason}` : ''}`,
    ip: getClientIP(req),
    device: parseDeviceFromUserAgent(req.headers['user-agent']),
    status: allowed ? 'SUCCESS' : 'FAILURE',
    riskLevel: allowed ? 'LOW' : 'HIGH',
    metadata: {
      documentId: document._id,
      documentTitle: document.title,
      classification: document.classification,
      securityLevel: document.securityLevel,
      action,
      reason,
    },
  });
}

/**
 * Middleware to enforce DRM on document downloads
 */
export async function enforceDRM(req, res, next) {
  try {
    const { id } = req.params;
    const action = req.query.drmAction || DRM_ACTIONS.DOWNLOAD;

    const document = await Document.findById(id);
    if (!document || document.isDeleted) {
      return res.status(404).json({ message: 'Document not found' });
    }

    const permission = checkDRMPermission(document, req.user, action);

    await logDRMAction(req, document, action, permission.allowed, permission.reason);

    if (!permission.allowed) {
      return res.status(403).json({
        message: permission.reason,
        drm: {
          enabled: true,
          action,
          denied: true,
        },
      });
    }

    // Attach DRM policy to request for downstream use
    req.drmPolicy = permission.policy;
    req.drmDocument = document;

    next();
  } catch (err) {
    next(err);
  }
}
