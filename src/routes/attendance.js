import { requireAuth } from '../middleware/auth.js';
import { Attendance } from '../models/Attendance.js';

export function registerAttendanceRoutes(router) {
  router.post('/attendance/check-in', requireAuth, async (req, res, next) => {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ message: 'Unauthorized' });
      const { location, device } = req.body || {};

      const entry = await Attendance.create({
        userId,
        type: 'CHECK_IN',
        location: location || 'Văn phòng Nexus (Hà Nội)',
        device: device || 'Thiết bị đã xác thực',
      });
      res.status(201).json({
        id: entry._id.toString(),
        type: entry.type,
        timestamp: entry.createdAt ? new Date(entry.createdAt).toISOString() : null,
        location: entry.location,
        device: entry.device,
      });
    } catch (err) {
      next(err);
    }
  });

  router.post('/attendance/check-out', requireAuth, async (req, res, next) => {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ message: 'Unauthorized' });
      const { location, device } = req.body || {};

      const entry = await Attendance.create({
        userId,
        type: 'CHECK_OUT',
        location: location || 'Văn phòng Nexus (Hà Nội)',
        device: device || 'Thiết bị đã xác thực',
      });
      res.status(201).json({
        id: entry._id.toString(),
        type: entry.type,
        timestamp: entry.createdAt ? new Date(entry.createdAt).toISOString() : null,
        location: entry.location,
        device: entry.device,
      });
    } catch (err) {
      next(err);
    }
  });

  router.get('/attendance/history', requireAuth, async (req, res, next) => {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ message: 'Unauthorized' });

      const history = await Attendance.find({ userId })
        .sort({ createdAt: -1 })
        .lean();
      res.json(
        history.map((h) => ({
          id: h._id.toString(),
          userId: h.userId?.toString?.() || h.userId,
          type: h.type || 'CHECK_IN',
          timestamp: h.createdAt ? new Date(h.createdAt).toISOString() : null,
          location: h.location || 'Văn phòng Nexus (Hà Nội)',
          device: h.device || 'Thiết bị đã xác thực',
        })),
      );
    } catch (err) {
      next(err);
    }
  });
}

