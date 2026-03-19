import { requireAuth } from '../middleware/auth.js';
import { Message } from '../models/Message.js';
import { ChatRoom } from '../models/ChatRoom.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Setup multer for file uploads - using memory storage then save manually
const uploadDir = path.join(process.cwd(), 'uploads', 'chat');
console.log('[Messages] Upload directory:', uploadDir);
if (!fs.existsSync(uploadDir)) {
  console.log('[Messages] Creating upload directory...');
  fs.mkdirSync(uploadDir, { recursive: true });
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

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

  // POST message with file attachment
  router.post('/messages', requireAuth, upload.single('file'), async (req, res, next) => {
    try {
      const { text, room } = req.body;
      const user = req.user;

      console.log('[POST /messages] User:', user?.email, 'Has file:', !!req.file, 'Text:', text, 'Room:', room);

      let fileUrl = null;
      let fileType = null;
      let fileName = null;

      if (req.file) {
        // Save file from memory to disk
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = path.extname(req.file.originalname).toLowerCase();
        const filename = `${uniqueSuffix}${ext}`;
        const filepath = path.join(uploadDir, filename);

        await fs.promises.writeFile(filepath, req.file.buffer);

        fileUrl = `/uploads/chat/${filename}`;
        fileType = req.file.mimetype;
        fileName = req.file.originalname;
      }

      const msg = await Message.create({
        userId: user.id,
        userName: user.name || 'Ẩn danh',
        text: text || '',
        room: room || 'general',
        attachments: req.file ? [{
          url: fileUrl,
          type: fileType,
          name: fileName,
          size: req.file.size,
        }] : [],
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
          attachments: msg.attachments || [],
        },
      });
    } catch (err) {
      console.error('[POST /messages] Error:', err);
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
