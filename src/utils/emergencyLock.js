import { User } from '../models/User.js';
import { Document } from '../models/Document.js';
import { AuditLog } from '../models/AuditLog.js';
import { sendEmail } from '../utils/emailService.js';
import { getClientIP } from '../middleware/securityMiddleware.js';
import { revokeAllDocumentLinks } from './secureDownloadLink.js';

/**
 * Emergency Lock System
 * Khóa toàn bộ hệ thống hoặc tài liệu cụ thể khi phát hiện breach
 */

// In-memory emergency state
const emergencyState = {
  active: false,
  activatedAt: null,
  activatedBy: null,
  type: null, // 'SYSTEM', 'DOCUMENT', 'USER', 'DEPARTMENT'
  targetId: null,
  reason: null,
  affectedUsers: [],
  affectedDocuments: [],
  autoUnlockAt: null, // Optional auto-unlock after X minutes
};

/**
 * Activate emergency lock
 * @param {object} req - Express request
 * @param {string} type - 'SYSTEM' | 'DOCUMENT' | 'USER' | 'DEPARTMENT'
 * @param {string} targetId - ID của target
 * @param {string} reason - Lý do
 * @param {number} autoUnlockMinutes - Tự động mở khóa sau X phút (null = manual)
 */
export async function activateEmergencyLock(req, type, targetId, reason, autoUnlockMinutes = null) {
  const activatedBy = req?.user?.id || 'SYSTEM';
  const activatedByName = req?.user?.name || 'System';

  // Update state
  emergencyState.active = true;
  emergencyState.activatedAt = new Date();
  emergencyState.activatedBy = activatedBy;
  emergencyState.type = type;
  emergencyState.targetId = targetId;
  emergencyState.reason = reason;

  if (autoUnlockMinutes) {
    emergencyState.autoUnlockAt = new Date(Date.now() + autoUnlockMinutes * 60 * 1000);

    // Schedule auto-unlock
    setTimeout(() => {
      if (emergencyState.active && emergencyState.targetId === targetId) {
        deactivateEmergencyLock(null, 'AUTO_UNLOCK');
      }
    }, autoUnlockMinutes * 60 * 1000);
  }

  // Perform actions based on type
  let result = { success: true };

  switch (type) {
    case 'SYSTEM':
      // Lock all users (except admins)
      result = await lockAllUsers(activatedBy, activatedByName, reason);
      break;

    case 'DOCUMENT':
      // Lock specific document
      result = await lockDocument(targetId, activatedBy, activatedByName, reason);
      break;

    case 'USER':
      // Lock specific user
      result = await lockUser(targetId, activatedBy, activatedByName, reason);
      break;

    case 'DEPARTMENT':
      // Lock all users in department
      result = await lockDepartment(targetId, activatedBy, activatedByName, reason);
      break;

    case 'BREACH_DETECTED':
      // Full breach response
      result = await fullBreachResponse(req, reason);
      break;
  }

  // Log
  await AuditLog.create({
    userId: activatedBy,
    userName: activatedByName,
    action: 'EMERGENCY_LOCK_ACTIVATED',
    details: `Emergency lock activated: ${type} - ${reason}`,
    ip: req ? getClientIP(req) : 'SYSTEM',
    device: req?.headers?.['user-agent'] || 'System',
    status: 'ALERT',
    riskLevel: 'CRITICAL',
    metadata: {
      type,
      targetId,
      reason,
      autoUnlockMinutes,
      affectedUsers: result.affectedUsers || [],
      affectedDocuments: result.affectedDocuments || [],
    },
  });

  // Send alerts
  await sendEmergencyAlerts(type, reason, result, activatedByName);

  return {
    success: true,
    type,
    targetId,
    reason,
    activatedAt: emergencyState.activatedAt,
    autoUnlockAt: emergencyState.autoUnlockAt,
    affected: result,
  };
}

/**
 * Deactivate emergency lock
 */
export async function deactivateEmergencyLock(req, reason = 'MANUAL') {
  const deactivatedBy = req?.user?.id || 'SYSTEM';
  const deactivatedByName = req?.user?.name || 'System';

  // Unlock based on what was locked
  if (emergencyState.type === 'SYSTEM') {
    await unlockAllUsers(deactivatedBy, deactivatedByName, reason);
  } else if (emergencyState.type === 'DOCUMENT') {
    await unlockDocument(emergencyState.targetId);
  } else if (emergencyState.type === 'USER') {
    await unlockUser(emergencyState.targetId);
  } else if (emergencyState.type === 'DEPARTMENT') {
    await unlockDepartment(emergencyState.targetId);
  }

  // Log
  await AuditLog.create({
    userId: deactivatedBy,
    userName: deactivatedByName,
    action: 'EMERGENCY_LOCK_DEACTIVATED',
    details: `Emergency lock deactivated: ${emergencyState.type} - ${reason}`,
    ip: req ? getClientIP(req) : 'SYSTEM',
    device: req?.headers?.['user-agent'] || 'System',
    status: 'SUCCESS',
    riskLevel: 'MEDIUM',
    metadata: {
      previousType: emergencyState.type,
      previousTarget: emergencyState.targetId,
      reason,
      duration: emergencyState.activatedAt
        ? Date.now() - new Date(emergencyState.activatedAt).getTime()
        : 0,
    },
  });

  // Reset state
  const previousState = { ...emergencyState };
  emergencyState.active = false;
  emergencyState.activatedAt = null;
  emergencyState.activatedBy = null;
  emergencyState.type = null;
  emergencyState.targetId = null;
  emergencyState.reason = null;
  emergencyState.affectedUsers = [];
  emergencyState.affectedDocuments = [];
  emergencyState.autoUnlockAt = null;

  return {
    success: true,
    previousState,
    deactivatedAt: new Date(),
  };
}

/**
 * Get emergency lock status
 */
export function getEmergencyLockStatus() {
  return {
    active: emergencyState.active,
    activatedAt: emergencyState.activatedAt,
    activatedBy: emergencyState.activatedBy,
    type: emergencyState.type,
    targetId: emergencyState.targetId,
    reason: emergencyState.reason,
    affectedUsers: emergencyState.affectedUsers.length,
    affectedDocuments: emergencyState.affectedDocuments.length,
    autoUnlockAt: emergencyState.autoUnlockAt,
    isAutoUnlockPending: emergencyState.autoUnlockAt
      ? Date.now() < new Date(emergencyState.autoUnlockAt).getTime()
      : false,
  };
}

// ============ PRIVATE HELPERS ============

async function lockAllUsers(by, byName, reason) {
  const locked = await User.updateMany(
    { role: { $ne: 'ADMIN' }, isLocked: false },
    {
      isLocked: true,
      status: 'LOCKED',
      lockedReason: `Emergency lock: ${reason}`,
      lockedAt: new Date(),
    }
  );

  emergencyState.affectedUsers = locked.modifiedCount;

  return { affectedUsers: locked.modifiedCount };
}

async function unlockAllUsers(by, byName, reason) {
  const unlocked = await User.updateMany(
    { lockedReason: { $regex: /Emergency lock/ } },
    {
      isLocked: false,
      status: 'ACTIVE',
      lockedReason: null,
      lockedAt: null,
    }
  );

  return { affectedUsers: unlocked.modifiedCount };
}

async function lockDocument(docId, by, byName, reason) {
  const doc = await Document.findByIdAndUpdate(docId, {
    isLocked: true,
    lockedAt: new Date(),
    lockedBy: by,
  });

  emergencyState.affectedDocuments = [docId];

  return { affectedDocuments: 1 };
}

async function unlockDocument(docId) {
  await Document.findByIdAndUpdate(docId, {
    isLocked: false,
    lockedAt: null,
    lockedBy: null,
  });

  return { affectedDocuments: 1 };
}

async function lockUser(userId, by, byName, reason) {
  const user = await User.findByIdAndUpdate(userId, {
    isLocked: true,
    status: 'LOCKED',
    lockedReason: `Emergency lock: ${reason}`,
    lockedAt: new Date(),
  });

  // Revoke all active download links
  await revokeAllDocumentLinks('*', userId);

  emergencyState.affectedUsers = [userId];

  return { affectedUsers: 1 };
}

async function unlockUser(userId) {
  await User.findByIdAndUpdate(userId, {
    isLocked: false,
    status: 'ACTIVE',
    lockedReason: null,
    lockedAt: null,
  });

  return { affectedUsers: 1 };
}

async function lockDepartment(deptId, by, byName, reason) {
  const locked = await User.updateMany(
    { departmentId: deptId, isLocked: false },
    {
      isLocked: true,
      status: 'LOCKED',
      lockedReason: `Emergency lock (dept): ${reason}`,
      lockedAt: new Date(),
    }
  );

  emergencyState.affectedUsers = locked.modifiedCount;

  return { affectedUsers: locked.modifiedCount };
}

async function unlockDepartment(deptId) {
  const unlocked = await User.updateMany(
    { departmentId: deptId, lockedReason: { $regex: /Emergency lock.*dept/ } },
    {
      isLocked: false,
      status: 'ACTIVE',
      lockedReason: null,
      lockedAt: null,
    }
  );

  return { affectedUsers: unlocked.modifiedCount };
}

async function fullBreachResponse(req, reason) {
  const ip = req ? getClientIP(req) : 'SYSTEM';

  // 1. Lock all non-admin users
  const lockedUsers = await User.updateMany(
    { role: { $ne: 'ADMIN' } },
    {
      isLocked: true,
      status: 'LOCKED',
      lockedReason: `BREACH DETECTED: ${reason}`,
      lockedAt: new Date(),
    }
  );

  // 2. Lock all CRITICAL/CONFIDENTIAL documents
  const lockedDocs = await Document.updateMany(
    {
      classification: 'CONFIDENTIAL',
      isLocked: false,
    },
    {
      isLocked: true,
      lockedAt: new Date(),
    }
  );

  // 3. Revoke all download links
  // (Already handled by revokeAllDocumentLinks in secureDownloadLink)

  emergencyState.affectedUsers = lockedUsers.modifiedCount;
  emergencyState.affectedDocuments = lockedDocs.modifiedCount;

  return {
    affectedUsers: lockedUsers.modifiedCount,
    affectedDocuments: lockedDocs.modifiedCount,
    actions: ['LOCKED_ALL_USERS', 'LOCKED_CONFIDENTIAL_DOCS', 'REVOKED_ALL_LINKS'],
  };
}

async function sendEmergencyAlerts(type, reason, result, activatedBy) {
  const admins = await User.find({ role: 'ADMIN' }).select('email name');

  for (const admin of admins) {
    try {
      await sendEmail({
        to: admin.email,
        subject: `🚨 [EMERGENCY] Khóa khẩn cấp đã được kích hoạt`,
        html: `
          <div style="font-family: Arial; max-width: 600px; margin: 0 auto;">
            <div style="background: #dc2626; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0;">🚨 KHẨN CẤP: HỆ THỐNG BỊ KHÓA</h1>
            </div>
            <div style="border: 2px solid #dc2626; border-top: none; padding: 20px;">
              <table style="width: 100%;">
                <tr>
                  <td style="padding: 8px 0; color: #6b7280;">Loại khóa</td>
                  <td style="padding: 8px 0; font-weight: bold; color: #dc2626;">${type}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280;">Lý do</td>
                  <td style="padding: 8px 0; font-weight: bold;">${reason}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280;">Kích hoạt bởi</td>
                  <td style="padding: 8px 0;">${activatedBy}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280;">Thời gian</td>
                  <td style="padding: 8px 0;">${new Date().toLocaleString('vi-VN')}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280;">Người dùng bị khóa</td>
                  <td style="padding: 8px 0; font-weight: bold;">${result.affectedUsers || 0} người</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280;">Tài liệu bị khóa</td>
                  <td style="padding: 8px 0; font-weight: bold;">${result.affectedDocuments || 0} tài liệu</td>
                </tr>
              </table>
              <div style="background: #fef2f2; border: 1px solid #fecaca; padding: 12px; border-radius: 8px; margin-top: 16px;">
                <strong style="color: #dc2626;">Hành động cần thiết:</strong>
                <ul style="margin: 8px 0 0 0; padding-left: 20px;">
                  <li>Kiểm tra log hệ thống ngay lập tức</li>
                  <li>Liên hệ đội bảo mật</li>
                  <li>Xem xét thông báo cho người dùng bị ảnh hưởng</li>
                  <li>Điều tra nguyên nhân gốc</li>
                </ul>
              </div>
            </div>
          </div>
        `,
      });
    } catch (e) {
      console.error('[EmergencyLock] Alert email failed:', e.message);
    }
  }
}

/**
 * Middleware kiểm tra emergency lock trước mỗi request
 */
export function emergencyLockMiddleware(req, res, next) {
  // Chỉ check khi có emergency lock active
  if (!emergencyState.active) return next();

  // Admin luôn được qua
  if (req.user?.role === 'ADMIN') return next();

  // Check theo loại lock
  switch (emergencyState.type) {
    case 'SYSTEM':
      // Tất cả non-admin bị chặn
      return res.status(503).json({
        message: 'Hệ thống đang trong trạng thái khẩn cấp. Vui lòng liên hệ Admin.',
        emergency: true,
        reason: emergencyState.reason,
        activatedAt: emergencyState.activatedAt,
        contactAdmin: true,
      });

    case 'DOCUMENT':
      // Chỉ chặn truy cập document cụ thể
      if (req.params?.id === emergencyState.targetId) {
        return res.status(403).json({
          message: 'Tài liệu này đang bị khóa khẩn cấp.',
          emergency: true,
          reason: emergencyState.reason,
          documentId: emergencyState.targetId,
        });
      }
      break;

    case 'USER':
      // Chỉ chặn user cụ thể
      if (req.user?.id === emergencyState.targetId) {
        return res.status(403).json({
          message: 'Tài khoản của bạn đang bị tạm khóa do trạng thái khẩn cấp.',
          emergency: true,
          reason: emergencyState.reason,
        });
      }
      break;

    case 'DEPARTMENT':
      // Chặn users trong department
      if (req.user?.departmentId === emergencyState.targetId) {
        return res.status(403).json({
          message: 'Phòng ban của bạn đang bị tạm khóa.',
          emergency: true,
          reason: emergencyState.reason,
        });
      }
      break;
  }

  next();
}
