import { User } from '../models/User.js';
import { AuditLog } from '../models/AuditLog.js';
import { getClientIP, parseDeviceFromUserAgent } from '../middleware/securityMiddleware.js';

/**
 * Actions that require MFA verification
 */
export const SENSITIVE_ACTIONS = {
  DOCUMENT_DOWNLOAD_CRITICAL: {
    name: 'Tải tài liệu CRITICAL',
    mfaRequired: true,
    minTrustScore: 70,
    alertOnFail: true,
  },
  DOCUMENT_DELETE_CRITICAL: {
    name: 'Xóa tài liệu CRITICAL',
    mfaRequired: true,
    minTrustScore: 80,
    alertOnFail: true,
  },
  USER_LOCK: {
    name: 'Khóa tài khoản người dùng',
    mfaRequired: true,
    minTrustScore: 80,
    alertOnFail: true,
  },
  USER_UNLOCK: {
    name: 'Mở khóa tài khoản người dùng',
    mfaRequired: true,
    minTrustScore: 75,
    alertOnFail: true,
  },
  SECURITY_CONFIG_CHANGE: {
    name: 'Thay đổi cấu hình bảo mật',
    mfaRequired: true,
    minTrustScore: 85,
    alertOnFail: true,
  },
  EXPORT_AUDIT_LOG: {
    name: 'Xuất nhật ký audit',
    mfaRequired: true,
    minTrustScore: 80,
    alertOnFail: true,
  },
  BULK_DATA_ACCESS: {
    name: 'Truy cập dữ liệu hàng loạt',
    mfaRequired: true,
    minTrustScore: 70,
    alertOnFail: true,
  },
  MFA_DISABLE: {
    name: 'Tắt MFA',
    mfaRequired: true,
    minTrustScore: 90,
    alertOnFail: true,
  },
  PASSWORD_CHANGE_ADMIN: {
    name: 'Đổi mật khẩu người dùng khác',
    mfaRequired: true,
    minTrustScore: 85,
    alertOnFail: true,
  },
};

/**
 * Check if an action requires MFA and if the user qualifies
 * @param {string} action - The action key from SENSITIVE_ACTIONS
 * @param {object} user - The user object from req.user
 * @returns {object} - { requiresMfa, reason, passed }
 */
export function checkSensitiveAction(action, user) {
  const actionConfig = SENSITIVE_ACTIONS[action];
  if (!actionConfig) {
    return { requiresMfa: false, reason: null, passed: true };
  }

  // If MFA is not enabled for the user, check trust score
  const userTrustScore = user.trustScore ?? 95;

  if (userTrustScore < actionConfig.minTrustScore) {
    return {
      requiresMfa: true,
      reason: `Trust Score thấp (${userTrustScore}/${actionConfig.minTrustScore}). Yêu cầu xác minh MFA.`,
      passed: false,
      actionName: actionConfig.name,
    };
  }

  return {
    requiresMfa: actionConfig.mfaRequired,
    reason: actionConfig.mfaRequired ? `Hành động "${actionConfig.name}" yêu cầu xác minh MFA.` : null,
    passed: true,
    actionName: actionConfig.name,
  };
}

/**
 * Verify TOTP code for a user
 */
export async function verifyMFAForAction(req, res, next) {
  try {
    const { action, mfaCode, targetUserId } = req.body;

    if (!action || !SENSITIVE_ACTIONS[action]) {
      return res.status(400).json({ message: 'Invalid sensitive action' });
    }

    if (!mfaCode) {
      return res.status(400).json({
        message: 'MFA code is required for this action',
        requiresMfa: true,
        action,
        actionName: SENSITIVE_ACTIONS[action].name,
      });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if user has MFA enabled
    if (!user.mfaEnabled || !user.mfaSecret) {
      // If MFA is not enabled but trust score check fails, block the action
      const actionConfig = SENSITIVE_ACTIONS[action];
      if (req.user.trustScore < actionConfig.minTrustScore) {
        return res.status(403).json({
          message: `Trust Score không đủ (${req.user.trustScore}/${actionConfig.minTrustScore}). Bật MFA để thực hiện hành động này.`,
          requiresMfa: true,
          mfaSetupRequired: true,
        });
      }
      return res.json({ verified: true, mfaRequired: false });
    }

    // Verify TOTP code
    const { authenticator } = await import('otplib');
    const isValid = authenticator.verify({ token: mfaCode, secret: user.mfaSecret });

    if (!isValid) {
      // Log failed MFA attempt
      await AuditLog.create({
        userId: req.user.id,
        userName: req.user.name,
        action: 'MFA_VERIFY_FAILED',
        details: `Failed MFA verification for sensitive action: ${action} - ${SENSITIVE_ACTIONS[action].name}`,
        ip: getClientIP(req),
        device: parseDeviceFromUserAgent(req.headers['user-agent']),
        status: 'FAILURE',
        riskLevel: 'HIGH',
        targetUserId: targetUserId || null,
      });

      // Decrease trust score on failed MFA
      await User.findByIdAndUpdate(req.user.id, {
        $inc: { trustScore: -5 },
      });

      return res.status(401).json({
        message: 'MFA code không hợp lệ',
        verified: false,
        requiresMfa: true,
      });
    }

    // Log successful MFA verification
    await AuditLog.create({
      userId: req.user.id,
      userName: req.user.name,
      action: 'MFA_VERIFY_SUCCESS',
      details: `MFA verified for sensitive action: ${action} - ${SENSITIVE_ACTIONS[action].name}`,
      ip: getClientIP(req),
      device: parseDeviceFromUserAgent(req.headers['user-agent']),
      status: 'SUCCESS',
      riskLevel: 'MEDIUM',
      targetUserId: targetUserId || null,
    });

    res.json({
      verified: true,
      mfaRequired: true,
      action,
      actionName: SENSITIVE_ACTIONS[action].name,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Middleware factory for sensitive action MFA protection
 * @param {string} action - The action key from SENSITIVE_ACTIONS
 * @returns {function} - Express middleware
 */
export function requireMFAForAction(action) {
  return async (req, res, next) => {
    try {
      const actionConfig = SENSITIVE_ACTIONS[action];
      if (!actionConfig) return next();

      const user = await User.findById(req.user.id);
      if (!user) return res.status(404).json({ message: 'User not found' });

      // Check if MFA is required based on trust score
      const userTrustScore = req.user.trustScore ?? 95;

      if (userTrustScore < actionConfig.minTrustScore) {
        if (!req.body.mfaCode) {
          return res.status(403).json({
            message: `Trust Score không đủ (${userTrustScore}/${actionConfig.minTrustScore}). Vui lòng nhập mã MFA.`,
            requiresMfa: true,
            mfaRequired: true,
            action,
            actionName: actionConfig.name,
            hint: 'Thêm "mfaCode" vào request body',
          });
        }

        // Verify MFA
        const { authenticator } = await import('otplib');
        const isValid = authenticator.verify({
          token: req.body.mfaCode,
          secret: user.mfaSecret,
        });

        if (!isValid) {
          await AuditLog.create({
            userId: req.user.id,
            userName: req.user.name,
            action: 'MFA_VERIFY_FAILED',
            details: `Failed MFA for action: ${action} - ${actionConfig.name}`,
            ip: getClientIP(req),
            device: parseDeviceFromUserAgent(req.headers['user-agent']),
            status: 'FAILURE',
            riskLevel: 'HIGH',
          });

          return res.status(401).json({
            message: 'MFA code không hợp lệ',
            verified: false,
            requiresMfa: true,
          });
        }

        // Log success
        await AuditLog.create({
          userId: req.user.id,
          userName: req.user.name,
          action: 'MFA_VERIFY_SUCCESS',
          details: `MFA verified for: ${action} - ${actionConfig.name}`,
          ip: getClientIP(req),
          device: parseDeviceFromUserAgent(req.headers['user-agent']),
          status: 'SUCCESS',
          riskLevel: 'MEDIUM',
        });
      }

      next();
    } catch (err) {
      next(err);
    }
  };
}
