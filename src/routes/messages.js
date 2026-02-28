import { requireAuth } from '../middleware/auth.js';
import { Message } from '../models/Message.js';

export function registerMessageRoutes(router) {
  router.get('/messages', requireAuth, async (req, res, next) => {
    try {
      const room = req.query.room;
      const filter = room ? { room: room } : {};
      const msgs = await Message.find(filter).sort({ createdAt: 1 }).lean();
      res.json(
        msgs.map((m) => ({
          id: m._id.toString(),
          userId: m.userId?.toString?.() || m.userId,
          userName: m.userName || 'Ẩn danh',
          text: m.text || '',
          room: m.room || 'general',
          timestamp: m.createdAt ? new Date(m.createdAt).toISOString() : new Date().toISOString(),
        })),
      );
    } catch (err) {
      next(err);
    }
  });
}

