import { requireAuth } from '../middleware/auth.js';
import { Message } from '../models/Message.js';

export function registerMessageRoutes(router) {
  router.get('/messages', requireAuth, async (_req, res, next) => {
    try {
      const msgs = await Message.find().sort({ createdAt: 1 }).lean();
      res.json(
        msgs.map((m) => ({
          id: m._id.toString(),
          userId: m.userId,
          userName: m.userName,
          text: m.text,
          room: m.room,
          timestamp: m.createdAt,
        })),
      );
    } catch (err) {
      next(err);
    }
  });
}

