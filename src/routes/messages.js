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
          attachments: m.attachments || [],
        })),
      );
    } catch (err) {
      next(err);
    }
  });

  // POST message
  router.post('/messages', requireAuth, async (req, res, next) => {
    try {
      const user = req.user;
      const { text, room } = req.body || {};

      if (!text || !text.trim()) {
        return res.status(400).json({ message: 'Text is required' });
      }

      const msg = await Message.create({
        userId: user.id,
        userName: user.name || 'Ẩn danh',
        text: text.trim(),
        room: room || 'general',
      });

      res.json({
        success: true,
        message: {
          id: msg._id.toString(),
          userId: msg.userId?.toString?.() || msg.userId,
          userName: msg.userName || 'Ẩn danh',
          userAvatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(user.name || 'default')}`,
          text: msg.text || '',
          room: msg.room || 'general',
          timestamp: msg.createdAt ? new Date(msg.createdAt).toISOString() : new Date().toISOString(),
          reactions: [],
          attachments: [],
        },
      });
    } catch (err) {
      next(err);
    }
  });

  // DELETE / recall message (only by owner)
  router.delete('/messages/:id', requireAuth, async (req, res, next) => {
    try {
      const user = req.user;
      const msg = await Message.findById(req.params.id);

      if (!msg) {
        return res.status(404).json({ success: false, message: 'Tin nhắn không tồn tại' });
      }

      // Chỉ người gửi mới được thu hồi
      if (msg.userId.toString() !== user.id) {
        return res.status(403).json({ success: false, message: 'Bạn không có quyền thu hồi tin nhắn này' });
      }

      // Kiểm tra thời gian: chỉ được thu hồi trong 24h
      const hoursSinceCreated = (Date.now() - msg.createdAt.getTime()) / (1000 * 60 * 60);
      if (hoursSinceCreated > 24) {
        return res.status(400).json({ success: false, message: 'Chỉ có thể thu hồi tin nhắn trong vòng 24 giờ' });
      }

      await Message.deleteOne({ _id: msg._id });

      res.json({ success: true, message: 'Tin nhắn đã được thu hồi' });
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
      const isManager = currentUser.role === 'MANAGER';

      // Build query
      let query = { isDeleted: { $ne: true }, isLocked: { $ne: true } };

      // Staff sees ALL rooms (including private rooms from other departments)
      // Manager sees system rooms + their department rooms
      if (isManager && currentUser.departmentId) {
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

      // Check if user is a member of each room
      const roomsWithMembership = rooms.map((r) => {
        const isMember = r.members?.some(
          (m) => m.userId?.toString() === currentUser.id && !m.leftAt
        );
        return {
          id: r._id.toString(),
          name: r.name,
          description: r.description || '',
          type: 'channel',
          isPinned: r.isSystemRoom || false,
          unread: 0,
          departmentId: r.departmentId?.toString() || null,
          isMember: !!isMember,
          isPrivate: r.isPrivate || r.joinCode != null,
          hasJoinCode: r.joinCode != null,
        };
      });

      res.json({ rooms: roomsWithMembership });
    } catch (err) {
      next(err);
    }
  });
}
