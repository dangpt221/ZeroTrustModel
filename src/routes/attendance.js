import { requireAuth } from '../middleware/auth.js';
import { Attendance } from '../models/Attendance.js';

export function registerAttendanceRoutes(router) {
  router.post('/attendance/check-in', requireAuth, async (req, res, next) => {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ message: 'Unauthorized' });

      const entry = await Attendance.create({
        userId,
        type: 'CHECK_IN',
      });
      res.status(201).json({ id: entry._id.toString() });
    } catch (err) {
      next(err);
    }
  });

  router.get('/attendance/history', requireAuth, async (req, res, next) => {
    try {
      const userId = req.user?.id;
      const history = await Attendance.find({ userId })
        .sort({ createdAt: -1 })
        .lean();
      res.json(
        history.map((h) => ({
          id: h._id.toString(),
          userId: h.userId,
          type: h.type,
          timestamp: h.createdAt,
          location: h.location,
          device: h.device,
        })),
      );
    } catch (err) {
      next(err);
    }
  });
}

