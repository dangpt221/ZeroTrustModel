import { User } from '../models/User.js';
import { AuditLog } from '../models/AuditLog.js';

/**
 * In-memory Tracker. For production, this should be backed by Redis TTL
 */
const downloadWindowTracker = new Map();
const WINDOW_MS = 2 * 60 * 1000; // 2 minutes
const CRITICAL_FILE_LIMIT = 5;

/**
 * Checks for abnormal download/stream behavior
 * If a user accesses > LIMIT high-sensitivity files within the time window,
 * their account gets automatically locked (Zero Trust Enforcement).
 */
export async function checkAnomalyAndAutoLock(userId, sensitivity, ip, device) {
  if (!['HIGH', 'CRITICAL'].includes(sensitivity)) return { locked: false };

  const now = Date.now();
  
  if (!downloadWindowTracker.has(userId)) {
    downloadWindowTracker.set(userId, []);
  }

  const userHistory = downloadWindowTracker.get(userId);
  
  // Cleanup old entries
  const validHistory = userHistory.filter(timestamp => now - timestamp < WINDOW_MS);
  
  // Record new access
  validHistory.push(now);
  downloadWindowTracker.set(userId, validHistory);

  if (validHistory.length >= CRITICAL_FILE_LIMIT) {
    console.error(`[ZERO TRUST ALERT] Anomaly detected for user ${userId}. Auto-locking account!`);

    // Lock user database
    await User.findByIdAndUpdate(userId, {
      isLocked: true,
      lockReason: 'Hệ thống Zero Trust phát hiện hành vi truy cập dữ liệu nhạy cảm tự động (bot/scraping).',
      lockedAt: new Date()
    });

    // Write Critical Audit Log
    await AuditLog.create({
      userId,
      userName: 'SYSTEM',
      action: 'ZERO_TRUST_ENFORCEMENT',
      details: `Account auto-locked due to abnormal high-sensitivity file access (${validHistory.length} files in 2 mins)`,
      ip,
      device,
      status: 'CRITICAL',
      riskLevel: 'CRITICAL',
    });

    return { locked: true, reason: 'Tài khoản của bạn đã bị khoá khẩn cấp do phát hiện hành vi rút lõi dữ liệu hàng loạt.' };
  }

  return { locked: false };
}

export async function getAnomalyStats() {
  return {
    activeTrackedUsers: downloadWindowTracker.size,
    windowSizeMinutes: WINDOW_MS / 60000,
    criticalLimit: CRITICAL_FILE_LIMIT,
  };
}
