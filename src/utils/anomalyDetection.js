import { AuditLog } from '../models/AuditLog.js';
import { User } from '../models/User.js';
import { Document } from '../models/Document.js';
import { getClientIP } from '../middleware/securityMiddleware.js';
import { sendEmail } from '../utils/emailService.js';

/**
 * Anomaly Detection - Phát hiện hành vi bất thường
 * Ngăn chặn mass download và phát hiện insider threat
 */

// In-memory cache (trong production nên dùng Redis)
const downloadHistoryCache = new Map();
const userBaselines = new Map();

// Cấu hình
const ANOMALY_CONFIG = {
  // Tải bất thường
  EXCESSIVE_DAILY: {
    threshold: 30,      // Bình thường < 5 docs/ngày, alert khi > 30
    multiplier: 5,      // Alert nếu > 5x baseline của user
  },
  // Giờ lạ
  UNUSUAL_HOURS: {
    start: 2,          // 2h sáng
    end: 6,             // 6h sáng
    maxAllowed: 2,      // Cho phép tối đa 2 lần tải trong khoảng này
  },
  // Tài liệu ngoài phòng ban
  CROSS_DEPARTMENT: {
    maxAllowed: 5,      // Alert khi truy cập > 5 docs ngoài dept
    windowDays: 7,      // Trong 7 ngày
  },
  // Tải sau giờ làm
  AFTER_HOURS: {
    start: 20,          // 8h tối (20:00)
    end: 6,             // 6h sáng
    maxAllowed: 3,
  },
  // Tài liệu CRITICAL
  CRITICAL_ACCESS: {
    maxPerDay: 5,
  },
  // Rapid fire (tải liên tục không nghỉ)
  RAPID_FIRE: {
    maxInMinute: 5,
    windowMs: 60 * 1000,
  },
  // Mass download
  MASS_DOWNLOAD: {
    threshold: 50,
    severity: 'CRITICAL',
  },
};

/**
 * Lấy lịch sử download gần đây của user
 */
async function getRecentDownloads(userId, windowDays = 7) {
  const cacheKey = `downloads_${userId}`;
  const cached = downloadHistoryCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < 60000) {
    return cached.data;
  }

  const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);
  const logs = await AuditLog.find({
    userId,
    action: { $in: ['DOCUMENT_DOWNLOAD', 'DOCUMENT_WATERMARKED_DOWNLOAD'] },
    createdAt: { $gte: since },
  })
    .select('createdAt metadata details')
    .sort({ createdAt: -1 })
    .lean();

  const downloads = logs.map(log => ({
    timestamp: log.createdAt.getTime(),
    documentId: log.metadata?.documentId,
    documentTitle: log.metadata?.documentTitle,
    classification: log.metadata?.documentClassification,
    securityLevel: log.metadata?.securityLevel,
    hour: new Date(log.createdAt).getHours(),
  }));

  downloadHistoryCache.set(cacheKey, { data: downloads, timestamp: Date.now() });
  return downloads;
}

/**
 * Tính baseline cho user (download trung bình)
 */
async function getUserBaseline(userId) {
  if (userBaselines.has(userId)) {
    return userBaselines.get(userId);
  }

  // Tính baseline từ 30 ngày trước
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const logs = await AuditLog.countDocuments({
    userId,
    action: { $in: ['DOCUMENT_DOWNLOAD', 'DOCUMENT_WATERMARKED_DOWNLOAD'] },
    createdAt: { $gte: since },
  });

  const baseline = {
    totalLast30Days: logs,
    avgDaily: logs / 30,
    avgWeekly: logs / 4,
  };

  userBaselines.set(userId, baseline);
  return baseline;
}

/**
 * Phân tích hành vi và phát hiện bất thường
 */
export async function analyzeDownloadAnomalies(userId, user = null) {
  const anomalies = [];
  const downloads = await getRecentDownloads(userId, 7);
  const baseline = await getUserBaseline(userId);
  const now = Date.now();
  const oneDay = 24 * 60 * 60 * 1000;

  // 1. Excessive Download - tải quá nhiều
  const todayDownloads = downloads.filter(d => now - d.timestamp < oneDay);
  if (todayDownloads.length > ANOMALY_CONFIG.EXCESSIVE_DAILY.threshold) {
    anomalies.push({
      type: 'EXCESSIVE_DOWNLOAD',
      severity: 'CRITICAL',
      message: `Tải ${todayDownloads.length} tài liệu trong hôm nay (ngưỡng: ${ANOMALY_CONFIG.EXCESSIVE_DAILY.threshold})`,
      count: todayDownloads.length,
      threshold: ANOMALY_CONFIG.EXCESSIVE_DAILY.threshold,
      immediateAction: 'LOCK_ACCOUNT',
    });
  } else if (baseline.avgDaily > 0 && todayDownloads.length > baseline.avgDaily * ANOMALY_CONFIG.EXCESSIVE_DAILY.multiplier) {
    anomalies.push({
      type: 'EXCESSIVE_DOWNLOAD_ABOVE_BASELINE',
      severity: 'HIGH',
      message: `Tải ${todayDownloads.length} docs/ngày, cao hơn ${ANOMALY_CONFIG.EXCESSIVE_DAILY.multiplier}x baseline (${baseline.avgDaily.toFixed(1)} docs/ngày)`,
      count: todayDownloads.length,
      baseline: baseline.avgDaily,
      immediateAction: 'ALERT_ADMIN',
    });
  }

  // 2. Mass Download - tải rất nhiều trong thời gian ngắn
  if (todayDownloads.length > ANOMALY_CONFIG.MASS_DOWNLOAD.threshold) {
    anomalies.push({
      type: 'MASS_DOWNLOAD',
      severity: 'CRITICAL',
      message: `Mass download: ${todayDownloads.length} tài liệu - CÓ DẤU HIỆU DATA BREACH`,
      count: todayDownloads.length,
      immediateAction: 'LOCK_ACCOUNT',
    });
  }

  // 3. Unusual Hours - tải vào giờ lạ (2h-6h sáng)
  const unusualHoursDownloads = downloads.filter(
    d => d.hour >= ANOMALY_CONFIG.UNUSUAL_HOURS.start && d.hour < ANOMALY_CONFIG.UNUSUAL_HOURS.end
  );
  if (unusualHoursDownloads.length > ANOMALY_CONFIG.UNUSUAL_HOURS.maxAllowed) {
    anomalies.push({
      type: 'UNUSUAL_HOURS',
      severity: 'HIGH',
      message: `${unusualHoursDownloads.length} lần tải vào giờ lạ (${ANOMALY_CONFIG.UNUSUAL_HOURS.start}h-${ANOMALY_CONFIG.UNUSUAL_HOURS.end}h sáng)`,
      count: unusualHoursDownloads.length,
      documents: unusualHoursDownloads.map(d => d.documentTitle),
      immediateAction: 'ALERT_ADMIN',
    });
  }

  // 4. After Hours - tải sau giờ làm
  const afterHoursDownloads = downloads.filter(
    d => d.hour >= ANOMALY_CONFIG.AFTER_HOURS.start || d.hour < ANOMALY_CONFIG.AFTER_HOURS.end
  );
  if (afterHoursDownloads.length > ANOMALY_CONFIG.AFTER_HOURS.maxAllowed) {
    anomalies.push({
      type: 'AFTER_HOURS',
      severity: 'MEDIUM',
      message: `${afterHoursDownloads.length} lần tải sau giờ làm việc`,
      count: afterHoursDownloads.length,
      immediateAction: 'LOG_ONLY',
    });
  }

  // 5. Rapid Fire - tải liên tục không nghỉ
  const recentByMinute = downloads.filter(d => now - d.timestamp < ANOMALY_CONFIG.RAPID_FIRE.windowMs);
  if (recentByMinute.length > ANOMALY_CONFIG.RAPID_FIRE.maxInMinute) {
    anomalies.push({
      type: 'RAPID_FIRE',
      severity: 'HIGH',
      message: `Tải ${recentByMinute.length} tài liệu trong 1 phút - có thể là automated script`,
      count: recentByMinute.length,
      immediateAction: 'TEMPORARY_BLOCK',
    });
  }

  // 6. CRITICAL document access
  const criticalAccess = downloads.filter(
    d => d.classification === 'CONFIDENTIAL' && d.securityLevel >= 3
  );
  if (criticalAccess.length > ANOMALY_CONFIG.CRITICAL_ACCESS.maxPerDay) {
    anomalies.push({
      type: 'EXCESSIVE_CRITICAL_ACCESS',
      severity: 'HIGH',
      message: `Truy cập ${criticalAccess.length} tài liệu CONFIDENTIAL/CRITICAL (ngưỡng: ${ANOMALY_CONFIG.CRITICAL_ACCESS.maxPerDay})`,
      count: criticalAccess.length,
      documents: criticalAccess.map(d => d.documentTitle),
      immediateAction: 'ALERT_ADMIN',
    });
  }

  return anomalies;
}

/**
 * Thực hiện hành động dựa trên anomaly
 */
export async function executeAnomalyAction(anomaly, req, userId) {
  const ip = req ? getClientIP(req) : 'unknown';

  switch (anomaly.immediateAction) {
    case 'LOCK_ACCOUNT':
      // Lock tài khoản ngay lập tức
      await User.findByIdAndUpdate(userId, {
        isLocked: true,
        status: 'LOCKED',
        lockedReason: `Anomaly detected: ${anomaly.type} - ${anomaly.message}`,
        lockedAt: new Date(),
      });

      await AuditLog.create({
        userId,
        userName: req?.user?.name,
        action: 'AUTO_ACCOUNT_LOCKED',
        details: `Account auto-locked due to anomaly: ${anomaly.type} - ${anomaly.message}`,
        ip,
        device: req?.headers?.['user-agent'] || 'System',
        status: 'ALERT',
        riskLevel: 'CRITICAL',
        metadata: { anomalyType: anomaly.type, anomalySeverity: anomaly.severity },
      });

      // Gửi email cảnh báo cho admin
      await sendAnomalyAlert(req, anomaly, userId);
      break;

    case 'TEMPORARY_BLOCK':
      // Block tạm thời trong 15 phút
      await AuditLog.create({
        userId,
        userName: req?.user?.name,
        action: 'ANOMALY_TEMPORARY_BLOCK',
        details: `Temporary block due to: ${anomaly.type} - ${anomaly.message}`,
        ip,
        device: req?.headers?.['user-agent'] || 'System',
        status: 'WARNING',
        riskLevel: anomaly.severity,
      });
      break;

    case 'ALERT_ADMIN':
      await AuditLog.create({
        userId,
        userName: req?.user?.name,
        action: 'ANOMALY_ALERT',
        details: `Admin alert: ${anomaly.type} - ${anomaly.message}`,
        ip,
        device: req?.headers?.['user-agent'] || 'System',
        status: 'WARNING',
        riskLevel: anomaly.severity,
      });
      await sendAnomalyAlert(req, anomaly, userId);
      break;

    case 'LOG_ONLY':
      await AuditLog.create({
        userId,
        userName: req?.user?.name,
        action: 'ANOMALY_DETECTED',
        details: `${anomaly.type} - ${anomaly.message}`,
        ip,
        device: req?.headers?.['user-agent'] || 'System',
        status: 'WARNING',
        riskLevel: anomaly.severity,
      });
      break;
  }
}

/**
 * Gửi cảnh báo anomaly qua email cho admin
 */
async function sendAnomalyAlert(req, anomaly, userId) {
  const admins = await User.find({ role: 'ADMIN' }).select('email name');
  const user = await User.findById(userId).select('name email departmentId');

  for (const admin of admins) {
    try {
      await sendEmail({
        to: admin.email,
        subject: `[${anomaly.severity}] Cảnh báo bảo mật: ${anomaly.type}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: ${anomaly.severity === 'CRITICAL' ? '#dc2626' : '#d97706'}; color: white; padding: 16px; border-radius: 8px 8px 0 0;">
              <h2 style="margin: 0;">⚠️ Cảnh Báo Anomaly Detection</h2>
            </div>
            <div style="border: 1px solid #e5e7eb; border-top: none; padding: 20px; border-radius: 0 0 8px 8px;">
              <table style="width: 100%;">
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; width: 140px;">Mức độ</td>
                  <td style="padding: 8px 0; font-weight: bold; color: ${anomaly.severity === 'CRITICAL' ? '#dc2626' : '#d97706'};">
                    ${anomaly.severity}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280;">Loại</td>
                  <td style="padding: 8px 0; font-weight: bold;">${anomaly.type}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280;">Mô tả</td>
                  <td style="padding: 8px 0;">${anomaly.message}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280;">Người dùng</td>
                  <td style="padding: 8px 0;">
                    ${user?.name || 'Unknown'} (${user?.email || userId})
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280;">Hành động</td>
                  <td style="padding: 8px 0; font-weight: bold; color: #dc2626;">
                    ${anomaly.immediateAction === 'LOCK_ACCOUNT' ? '🔒 TÀI KHOẢN ĐÃ BỊ KHÓA TỰ ĐỘNG' : '📧 Cảnh báo đã gửi'}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280;">Thời gian</td>
                  <td style="padding: 8px 0;">${new Date().toLocaleString('vi-VN')}</td>
                </tr>
              </table>
              ${anomaly.immediateAction === 'LOCK_ACCOUNT' ? `
                <div style="background: #fef2f2; border: 1px solid #fecaca; padding: 12px; border-radius: 8px; margin-top: 16px;">
                  <strong style="color: #dc2626;">Tài khoản đã bị khóa tự động!</strong><br>
                  Người dùng không thể đăng nhập cho đến khi admin mở khóa.
                </div>
              ` : ''}
            </div>
          </div>
        `,
      });
    } catch (e) {
      console.error('[AnomalyDetection] Failed to send alert email:', e.message);
    }
  }
}

/**
 * Middleware kiểm tra anomaly trước khi download
 */
export async function anomalyCheckMiddleware(req, res, next) {
  try {
    const userId = req.user?.id;
    if (!userId) return next();

    // Chỉ check khi download
    if (!req.path.includes('/download')) return next();

    // Phân tích anomaly
    const anomalies = await analyzeDownloadAnomalies(userId, req.user);

    // Kiểm tra anomaly CRITICAL
    const criticalAnomaly = anomalies.find(a => a.severity === 'CRITICAL');

    if (criticalAnomaly) {
      // Lock account + block download
      await executeAnomalyAction(criticalAnomaly, req, userId);
      return res.status(403).json({
        message: 'Tài khoản của bạn đã bị tạm khóa do phát hiện hoạt động bất thường. Vui lòng liên hệ Admin.',
        blocked: true,
        reason: 'ANOMALY_DETECTED',
        anomalyType: criticalAnomaly.type,
        contactAdmin: true,
      });
    }

    // Cảnh báo anomaly HIGH
    const highAnomaly = anomalies.find(a => a.severity === 'HIGH');
    if (highAnomaly) {
      // Không block nhưng cảnh báo
      await executeAnomalyAction(highAnomaly, req, userId);
      res.setHeader('X-Security-Warning', 'Phát hiện hoạt động bất thường. Đã thông báo Admin.');
    }

    // Attach anomalies to request for logging
    req.anomalies = anomalies;

    next();
  } catch (err) {
    console.error('[AnomalyDetection] Error:', err);
    next();
  }
}

/**
 * Reset baseline cache khi cần
 */
export function resetUserBaseline(userId) {
  userBaselines.delete(userId);
  downloadHistoryCache.delete(`downloads_${userId}`);
}

/**
 * Lấy thống kê anomaly cho admin
 */
export async function getAnomalyStats() {
  const now = Date.now();
  const oneDay = 24 * 60 * 60 * 1000;

  const [criticalCount, highCount, mediumCount, lockedCount] = await Promise.all([
    AuditLog.countDocuments({
      action: { $in: ['AUTO_ACCOUNT_LOCKED', 'ANOMALY_ALERT'] },
      riskLevel: 'CRITICAL',
      createdAt: { $gte: new Date(now - oneDay) },
    }),
    AuditLog.countDocuments({
      action: 'ANOMALY_ALERT',
      riskLevel: 'HIGH',
      createdAt: { $gte: new Date(now - oneDay) },
    }),
    AuditLog.countDocuments({
      action: { $in: ['ANOMALY_DETECTED', 'ANOMALY_TEMPORARY_BLOCK'] },
      riskLevel: { $in: ['MEDIUM', 'LOW'] },
      createdAt: { $gte: new Date(now - oneDay) },
    }),
    User.countDocuments({ status: 'LOCKED', lockedReason: /Anomaly/ }),
  ]);

  return {
    last24Hours: {
      critical: criticalCount,
      high: highCount,
      medium: mediumCount,
    },
    currentlyLocked: lockedCount,
    recommendations: [
      lockedCount > 0 ? `${lockedCount} tài khoản đang bị khóa do anomaly` : 'Không có tài khoản bị khóa',
      criticalCount > 5 ? 'Có nhiều anomaly CRITICAL - Cần kiểm tra hệ thống' : 'Hoạt động bình thường',
    ],
  };
}
