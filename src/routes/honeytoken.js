import express from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { Honeytoken } from '../models/Honeytoken.js';
import { AuditLog } from '../models/AuditLog.js';
import { getClientIP, parseDeviceFromUserAgent } from '../middleware/securityMiddleware.js';
import { sendEmail } from '../utils/emailService.js';

const router = express.Router();

/**
 * Create a honeytoken (Admin only)
 * POST /api/honeytoken
 */
router.post('/', requireAuth, requireRole(['ADMIN']), async (req, res, next) => {
  try {
    const { name, type, description, expiresAt, alertWebhook, fakeDocumentId, fakeDepartmentId } = req.body;

    const honeytoken = await Honeytoken.create({
      name,
      type: type || 'DOCUMENT',
      description,
      createdBy: req.user.id,
      expiresAt: expiresAt || null,
      alertWebhook,
      fakeDocumentId,
      fakeDepartmentId,
    });

    await AuditLog.create({
      userId: req.user.id,
      userName: req.user.name,
      action: 'HONEYTOKEN_CREATE',
      details: `Created honeytoken: ${name} (type: ${type})`,
      ip: getClientIP(req),
      device: parseDeviceFromUserAgent(req.headers['user-agent']),
      status: 'SUCCESS',
      riskLevel: 'LOW',
    });

    res.status(201).json(honeytoken);
  } catch (err) {
    next(err);
  }
});

/**
 * Get all honeytokens (Admin only)
 * GET /api/honeytoken
 */
router.get('/', requireAuth, requireRole(['ADMIN']), async (req, res, next) => {
  try {
    const { triggered, active } = req.query;
    const query = {};

    if (triggered !== undefined) query.isTriggered = triggered === 'true';
    if (active !== undefined) query.isActive = active === 'true';

    const tokens = await Honeytoken.find(query)
      .populate('createdBy', 'name email')
      .populate('fakeDocumentId', 'title')
      .populate('fakeDepartmentId', 'name')
      .sort({ createdAt: -1 })
      .lean();

    res.json(tokens.map(t => ({
      id: t._id.toString(),
      name: t.name,
      type: t.type,
      description: t.description,
      createdBy: t.createdBy,
      isTriggered: t.isTriggered,
      triggeredAt: t.triggeredAt,
      triggeredBy: t.triggeredBy,
      triggeredByIp: t.triggeredByIp,
      triggerDetails: t.triggerDetails,
      isActive: t.isActive,
      expiresAt: t.expiresAt,
      accessLogs: t.accessLogs,
      alertEmail: t.alertEmail,
      alertWebhook: t.alertWebhook,
      alertAdmin: t.alertAdmin,
      fakeDocumentId: t.fakeDocumentId,
      fakeDepartmentId: t.fakeDepartmentId,
      createdAt: t.createdAt,
    })));
  } catch (err) {
    next(err);
  }
});

/**
 * Get honeytoken by ID
 * GET /api/honeytoken/:id
 */
router.get('/:id', requireAuth, requireRole(['ADMIN']), async (req, res, next) => {
  try {
    const token = await Honeytoken.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate('fakeDocumentId', 'title')
      .populate('fakeDepartmentId', 'name')
      .lean();

    if (!token) return res.status(404).json({ message: 'Honeytoken not found' });

    res.json(token);
  } catch (err) {
    next(err);
  }
});

/**
 * Trigger a honeytoken (called internally when honeytoken is accessed)
 * POST /api/honeytoken/:id/trigger
 */
router.post('/:id/trigger', async (req, res, next) => {
  try {
    const { userId, userAgent, action, details } = req.body;
    const ip = getClientIP(req);

    const token = await Honeytoken.findById(req.params.id);
    if (!token) return res.status(404).json({ message: 'Honeytoken not found' });

    // Mark as triggered
    token.isTriggered = true;
    token.triggeredAt = new Date();
    token.triggeredByIp = ip;
    token.triggerDetails = details || '';
    await token.save();

    // Log access
    token.accessLogs.push({
      timestamp: new Date(),
      ip,
      userAgent,
      userId,
      action: action || 'ACCESS',
      details: details || 'Honeytoken accessed',
    });
    await token.save();

    // Create HIGH risk audit log
    await AuditLog.create({
      userId: userId || null,
      userName: 'HONEYTOKEN_ALERT',
      action: 'HONEYTOKEN_TRIGGERED',
      details: `Honeytoken "${token.name}" was triggered! Possible data breach detected.`,
      ip,
      device: parseDeviceFromUserAgent(userAgent),
      status: 'ALERT',
      riskLevel: 'CRITICAL',
      metadata: {
        honeytokenId: token._id,
        honeytokenName: token.name,
        honeytokenType: token.type,
        triggeredBy: userId,
        action: action || 'ACCESS',
        details: details || '',
      },
    });

    // Send email alert
    if (token.alertEmail) {
      const admins = await import('../models/User.js').then(m => m.User.find({ role: 'ADMIN' }).select('email name'));
      for (const admin of admins) {
        try {
          await sendEmail({
            to: admin.email,
            subject: `[CRITICAL] Honeytoken Triggered: ${token.name}`,
            html: `
              <h2 style="color: red;">Cảnh báo bảo mật nghiêm trọng</h2>
              <p><strong>Honeytoken "${token.name}"</strong> đã bị kích hoạt!</p>
              <ul>
                <li><strong>Loại:</strong> ${token.type}</li>
                <li><strong>IP:</strong> ${ip}</li>
                <li><strong>Thời gian:</strong> ${new Date().toLocaleString('vi-VN')}</li>
                <li><strong>Hành động:</strong> ${action || 'Truy cập'}</li>
                <li><strong>Chi tiết:</strong> ${details || 'Không có'}</li>
                <li><strong>Người dùng:</strong> ${userId || 'Không xác định'}</li>
              </ul>
              <p style="color: red;"><strong>Hành động cần thiết:</strong> Kiểm tra ngay log hệ thống!</p>
            `,
          });
        } catch (e) {
          console.error('[Honeytoken] Failed to send alert email:', e.message);
        }
      }
    }

    // Call webhook
    if (token.alertWebhook) {
      try {
        await fetch(token.alertWebhook, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            alert: 'HONEYTOKEN_TRIGGERED',
            honeytoken: token.name,
            type: token.type,
            ip,
            timestamp: new Date().toISOString(),
            userId,
            action,
            details,
          }),
        });
      } catch (e) {
        console.error('[Honeytoken] Webhook failed:', e.message);
      }
    }

    res.json({ success: true, message: 'Honeytoken triggered and alerts sent' });
  } catch (err) {
    next(err);
  }
});

/**
 * Delete/deactivate a honeytoken (Admin only)
 * DELETE /api/honeytoken/:id
 */
router.delete('/:id', requireAuth, requireRole(['ADMIN']), async (req, res, next) => {
  try {
    const token = await Honeytoken.findByIdAndDelete(req.params.id);
    if (!token) return res.status(404).json({ message: 'Honeytoken not found' });

    await AuditLog.create({
      userId: req.user.id,
      userName: req.user.name,
      action: 'HONEYTOKEN_DELETE',
      details: `Deleted honeytoken: ${token.name}`,
      ip: getClientIP(req),
      device: parseDeviceFromUserAgent(req.headers['user-agent']),
      status: 'SUCCESS',
      riskLevel: 'LOW',
    });

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

/**
 * Update a honeytoken (Admin only)
 * PUT /api/honeytoken/:id
 */
router.put('/:id', requireAuth, requireRole(['ADMIN']), async (req, res, next) => {
  try {
    const { name, description, isActive, expiresAt, alertEmail, alertWebhook, alertAdmin } = req.body;

    const token = await Honeytoken.findById(req.params.id);
    if (!token) return res.status(404).json({ message: 'Honeytoken not found' });

    if (name) token.name = name;
    if (description !== undefined) token.description = description;
    if (isActive !== undefined) token.isActive = isActive;
    if (expiresAt !== undefined) token.expiresAt = expiresAt;
    if (alertEmail !== undefined) token.alertEmail = alertEmail;
    if (alertWebhook !== undefined) token.alertWebhook = alertWebhook;
    if (alertAdmin !== undefined) token.alertAdmin = alertAdmin;

    await token.save();

    res.json(token);
  } catch (err) {
    next(err);
  }
});

export default router;
