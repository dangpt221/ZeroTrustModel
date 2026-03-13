import { requireAuth } from '../middleware/auth.js';
import { Message } from '../models/Message.js';
import { ChatRoom } from '../models/ChatRoom.js';

// Default rooms to seed if none exist
const DEFAULT_ROOMS = [
  { name: 'Kênh chung', description: 'Kênh thông báo chung', type: 'GROUP', isSystemRoom: true },
  { name: 'An ninh SOC', description: 'Bảo mật & theo dõi', type: 'GROUP', isSystemRoom: true },
  { name: 'Kỹ thuật', description: 'Phát triển & kỹ thuật', type: 'GROUP', isSystemRoom: false },
  { name: 'Nhân sự', description: 'Nhân sự & chính sách', type: 'GROUP', isSystemRoom: false },
];

async function ensureDefaultRooms() {
  const count = await ChatRoom.countDocuments({ isDeleted: { $ne: true } });
  if (count === 0) {
    await ChatRoom.insertMany(DEFAULT_ROOMS.map(r => ({
      ...r,
      memberCount: 0,
      members: [],
    })));
  }
}

export function registerMessageRoutes(router) {
  // GET all messages for a room (all authenticated users)
  router.get('/messages', requireAuth, async (req, res, next) => {
    try {
      const room = req.query.room;
      const filter = { isDeleted: { $ne: true } };
      if (room) filter.room = room;
      const msgs = await Message.find(filter).sort({ createdAt: 1 }).limit(100).lean();
      res.json(
        msgs.map((m) => ({
          id: m._id.toString(),
          userId: m.userId?.toString?.() || m.userId,
          userName: m.userName || 'Ẩn danh',
          userAvatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(m.userName || 'default')}`,
          text: m.text || '',
          room: m.room || 'general',
          timestamp: m.createdAt ? new Date(m.createdAt).toISOString() : new Date().toISOString(),
          reactions: m.reactions || [],
        })),
      );
    } catch (err) {
      next(err);
    }
  });

  // GET all chat rooms (filtered by department for managers)
  router.get('/messaging/rooms', requireAuth, async (req, res, next) => {
    try {
      await ensureDefaultRooms();

      // Get current user to check department
      const currentUser = req.user;
      const isAdmin = currentUser.role === 'ADMIN';

      // Build query - managers only see their department's rooms + system rooms
      let query = { isDeleted: { $ne: true }, isLocked: { $ne: true } };

      if (!isAdmin && currentUser.departmentId) {
        // Manager/Staff sees system rooms OR rooms in their department
        query = {
          isDeleted: { $ne: true },
          isLocked: { $ne: true },
          $or: [
            { isSystemRoom: true },
            { departmentId: currentUser.departmentId }
          ]
        };
      }

      const rooms = await ChatRoom.find(query)
        .sort({ isSystemRoom: -1, name: 1 })
        .lean();

      res.json({
        rooms: rooms.map((r) => ({
          id: r._id.toString(),
          name: r.name,
          description: r.description || '',
          type: 'channel',
          isPinned: r.isSystemRoom || false,
          unread: 0,
          departmentId: r.departmentId?.toString() || null,
        })),
      });
    } catch (err) {
      next(err);
    }
  });
}
