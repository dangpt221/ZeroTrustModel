import mongoose from 'mongoose';
import { requireAuth } from '../middleware/auth.js';
import { ChatRoom } from '../models/ChatRoom.js';
import { Message } from '../models/Message.js';
import { User } from '../models/User.js';

// ============ HELPER FUNCTIONS ============

// Find or create 1-on-1 DM room
async function findOrCreateDMRoom(currentUserId, otherUserId) {
  let room = await ChatRoom.findOne({
    isDirectMessage: true,
    participants: { $all: [currentUserId, otherUserId], $size: 2 }
  });

  if (!room) {
    const otherUser = await User.findById(otherUserId).lean();
    const currentUser = await User.findById(currentUserId).lean();

    room = await ChatRoom.create({
      name: `DM-${currentUserId}-${otherUserId}`,
      description: `Chat riêng với ${otherUser?.name || 'Unknown'}`,
      type: 'PRIVATE',
      isPrivate: true,
      isDirectMessage: true,
      participants: [currentUserId, otherUserId],
      participantNames: [currentUser?.name || 'Unknown', otherUser?.name || 'Unknown'],
      relatedUserId: otherUserId,
      members: [
        { userId: currentUserId, role: 'MEMBER' },
        { userId: otherUserId, role: 'MEMBER' }
      ],
      memberCount: 2
    });
  }

  return room;
}

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

// ============ ROUTES ============

export function registerMessageRoutes(router) {

  // ===== 1. CONVERSATIONS / 1-ON-1 CHAT =====

  // Get all conversations (DMs) for current user
  router.get('/messaging/conversations', requireAuth, async (req, res, next) => {
    try {
      const currentUserId = new mongoose.Types.ObjectId(req.user.id);

      const dmRooms = await ChatRoom.find({
        isDirectMessage: true,
        participants: currentUserId,
        isDeleted: { $ne: true }
      }).sort({ lastMessageAt: -1 }).lean();

      const conversations = await Promise.all(dmRooms.map(async (room) => {
        const lastMessage = await Message.findOne({
          room: room._id.toString(),
          isDeleted: { $ne: true }
        }).sort({ createdAt: -1 }).lean();

        const otherParticipantId = room.participants.find(
          p => p.toString() !== currentUserId.toString()
        );

        const unreadCount = await Message.countDocuments({
          room: room._id.toString(),
          'readBy.userId': { $ne: currentUserId },
          userId: { $ne: currentUserId },
          isDeleted: { $ne: true }
        });

        let otherUser = null;
        if (otherParticipantId) {
          otherUser = await User.findById(otherParticipantId).select('name avatar').lean();
        }

        return {
          id: room._id.toString(),
          type: 'direct',
          name: otherUser?.name || 'Unknown',
          avatar: otherUser?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(otherUser?.name || 'default')}`,
          lastMessage: lastMessage ? {
            id: lastMessage._id.toString(),
            text: lastMessage.text,
            timestamp: lastMessage.createdAt,
            userId: lastMessage.userId?.toString()
          } : null,
          unreadCount,
          userId: otherParticipantId?.toString()
        };
      }));

      res.json({ conversations });
    } catch (err) {
      next(err);
    }
  });

  // Start a new 1-on-1 conversation
  router.post('/messaging/conversations', requireAuth, async (req, res, next) => {
    try {
      const currentUserId = new mongoose.Types.ObjectId(req.user.id);
      const { userId } = req.body;

      if (!userId) {
        return res.status(400).json({ error: 'userId is required' });
      }

      if (userId === req.user.id) {
        return res.status(400).json({ error: 'Cannot create conversation with yourself' });
      }

      const room = await findOrCreateDMRoom(currentUserId, userId);
      const otherUser = await User.findById(userId).select('name avatar').lean();

      res.json({
        id: room._id.toString(),
        type: 'direct',
        name: otherUser?.name || 'Unknown',
        avatar: otherUser?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(otherUser?.name || 'default')}`,
        userId: userId
      });
    } catch (err) {
      next(err);
    }
  });

  // ===== 2. MESSAGES =====

  // Get messages for a room (with threading support)
  router.get('/messages', requireAuth, async (req, res, next) => {
    try {
      const room = req.query.room;
      const filter = { isDeleted: { $ne: true } };
      if (room) filter.room = room;

      const msgs = await Message.find(filter)
        .sort({ createdAt: -1 })
        .limit(100)
        .lean();

      const currentUserId = req.user.id;
      res.json(
        msgs.map((m) => {
          const isRead = m.readBy?.some(r => r.userId.toString() === currentUserId);
          return {
            id: m._id.toString(),
            userId: m.userId?.toString?.() || m.userId,
            userName: m.userName || 'Ẩn danh',
            userAvatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(m.userName || 'default')}`,
            text: m.text || '',
            room: m.room || 'general',
            timestamp: m.createdAt ? new Date(m.createdAt).toISOString() : new Date().toISOString(),
            reactions: m.reactions || [],
            isEdited: m.isEdited || false,
            editedAt: m.editedAt ? new Date(m.editedAt).toISOString() : null,
            parentMessageId: m.parentMessageId?.toString() || null,
            replyCount: m.replyCount || 0,
            isRead: isRead || m.userId?.toString() === currentUserId,
            readCount: m.readBy?.length || 0,
            attachments: m.attachments || [],
            hasAttachments: m.hasAttachments || false
          };
        }).reverse()
      );
    } catch (err) {
      next(err);
    }
  });

  // Send a message
  router.post('/messages', requireAuth, async (req, res, next) => {
    try {
      const io = req.app.get('io');
      const { text, room, parentMessageId } = req.body;

      if (!text?.trim()) {
        return res.status(400).json({ error: 'Message text is required' });
      }

      const chatRoom = await ChatRoom.findById(room);

      // Parse @mentions from text
      const mentionRegex = /@(\w+\s\w+)/g;
      const mentions = [];
      let match;
      while ((match = mentionRegex.exec(text)) !== null) {
        mentions.push(match[1]);
      }

      const msg = await Message.create({
        userId: req.user.id,
        userName: req.user.name,
        text: text.trim(),
        room: room || 'general',
        parentMessageId: parentMessageId || null,
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      });

      if (parentMessageId) {
        await Message.findByIdAndUpdate(parentMessageId, {
          $inc: { replyCount: 1 }
        });
      }

      if (chatRoom) {
        await ChatRoom.findByIdAndUpdate(room, {
          lastMessageAt: new Date(),
          $inc: { messageCount: 1 }
        });
      }

      const userAvatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(req.user.name || 'default')}`;

      const messageData = {
        id: msg._id.toString(),
        userId: msg.userId?.toString?.() || msg.userId,
        userName: msg.userName || 'Ẩn danh',
        userAvatar,
        text: msg.text || '',
        room: msg.room || 'general',
        timestamp: msg.createdAt ? new Date(msg.createdAt).toISOString() : new Date().toISOString(),
        reactions: [],
        isEdited: false,
        parentMessageId: parentMessageId || null,
        replyCount: 0,
        isRead: true,
        readCount: 1,
        attachments: [],
        hasAttachments: false,
        mentions
      };

      if (io) {
        io.to(msg.room).emit('receive_message', messageData);

        if (mentions.length > 0) {
          const mentionedUsers = await User.find({ name: { $in: mentions } }).select('_id').lean();
          mentionedUsers.forEach(u => {
            io.to(`user_${u._id.toString()}`).emit('mentioned', {
              message: messageData,
              mentionedBy: req.user.name
            });
          });
        }
      }

      res.status(201).json(messageData);
    } catch (err) {
      next(err);
    }
  });

  // Get thread replies for a message
  router.get('/messages/:messageId/replies', requireAuth, async (req, res, next) => {
    try {
      const { messageId } = req.params;
      const replies = await Message.find({
        parentMessageId: messageId,
        isDeleted: { $ne: true }
      }).sort({ createdAt: 1 }).lean();

      const currentUserId = req.user.id;
      res.json(
        replies.map((m) => ({
          id: m._id.toString(),
          userId: m.userId?.toString?.() || m.userId,
          userName: m.userName || 'Ẩn danh',
          userAvatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(m.userName || 'default')}`,
          text: m.text || '',
          timestamp: m.createdAt ? new Date(m.createdAt).toISOString() : new Date().toISOString(),
          reactions: m.reactions || [],
          isRead: m.readBy?.some(r => r.userId.toString() === currentUserId) || m.userId?.toString() === currentUserId,
          attachments: m.attachments || []
        }))
      );
    } catch (err) {
      next(err);
    }
  });

  // ===== 3. MESSAGE RECALL (delete own message within 24h) =====
  router.delete('/messages/:id', requireAuth, async (req, res, next) => {
    try {
      const user = req.user;
      const msg = await Message.findById(req.params.id);
      if (!msg) {
        return res.status(404).json({ success: false, message: 'Tin nhắn không tồn tại' });
      }
      if (msg.userId.toString() !== user.id) {
        return res.status(403).json({ success: false, message: 'Bạn không có quyền thu hồi tin nhắn này' });
      }
      const hoursSinceCreated = (Date.now() - msg.createdAt.getTime()) / (1000 * 60 * 60);
      if (hoursSinceCreated > 24) {
        return res.status(400).json({ success: false, message: 'Chỉ có thể thu hồi tin nhắn trong vòng 24 giờ' });
      }

      await Message.deleteOne({ _id: msg._id });

      // Emit deletion to room
      const io = req.app.get('io');
      if (io) {
        io.to(msg.room).emit('message_deleted', { messageId: msg._id.toString() });
      }

      res.json({ success: true, message: 'Tin nhắn đã được thu hồi' });
    } catch (err) {
      next(err);
    }
  });

  // ===== 4. REACTIONS =====

  router.post('/messages/:messageId/reactions', requireAuth, async (req, res, next) => {
    try {
      const io = req.app.get('io');
      const { messageId } = req.params;
      const { emoji } = req.body;

      if (!emoji) {
        return res.status(400).json({ error: 'Emoji is required' });
      }

      const message = await Message.findById(messageId);
      if (!message) {
        return res.status(404).json({ error: 'Message not found' });
      }

      const existingReaction = message.reactions.find(
        r => r.userId.toString() === req.user.id && r.emoji === emoji
      );

      if (existingReaction) {
        message.reactions = message.reactions.filter(
          r => !(r.userId.toString() === req.user.id && r.emoji === emoji)
        );
      } else {
        message.reactions.push({
          userId: req.user.id,
          emoji,
          createdAt: new Date()
        });
      }

      await message.save();

      if (io) {
        io.to(message.room).emit('reaction_updated', {
          messageId: message._id.toString(),
          reactions: message.reactions
        });
      }

      res.json({ reactions: message.reactions });
    } catch (err) {
      next(err);
    }
  });

  // ===== 5. READ RECEIPTS =====

  router.post('/messages/:messageId/read', requireAuth, async (req, res, next) => {
    try {
      const io = req.app.get('io');
      const { messageId } = req.params;
      const currentUserId = req.user.id;

      const message = await Message.findById(messageId);
      if (!message) {
        return res.status(404).json({ error: 'Message not found' });
      }

      const alreadyRead = message.readBy?.some(r => r.userId.toString() === currentUserId);

      if (!alreadyRead) {
        message.readBy = message.readBy || [];
        message.readBy.push({
          userId: currentUserId,
          readAt: new Date()
        });
        await message.save();

        if (io) {
          io.to(message.room).emit('message_read', {
            messageId: message._id.toString(),
            userId: currentUserId,
            readAt: new Date().toISOString()
          });
        }
      }

      res.json({ success: true, readCount: message.readBy?.length || 0 });
    } catch (err) {
      next(err);
    }
  });

  router.post('/messages/room/:roomId/read-all', requireAuth, async (req, res, next) => {
    try {
      const io = req.app.get('io');
      const { roomId } = req.params;
      const currentUserId = req.user.id;

      const result = await Message.updateMany(
        {
          room: roomId,
          userId: { $ne: currentUserId },
          'readBy.userId': { $ne: currentUserId },
          isDeleted: { $ne: true }
        },
        {
          $push: {
            readBy: {
              userId: currentUserId,
              readAt: new Date()
            }
          }
        }
      );

      if (io) {
        io.to(roomId).emit('all_messages_read', {
          roomId,
          userId: currentUserId,
          readAt: new Date().toISOString(),
          count: result.modifiedCount
        });
      }

      res.json({ success: true, count: result.modifiedCount });
    } catch (err) {
      next(err);
    }
  });

  // ===== 6. @MENTIONS - Get users for mention autocomplete =====

  router.get('/messaging/users/search', requireAuth, async (req, res, next) => {
    try {
      const { q } = req.query;

      if (!q || q.length < 2) {
        return res.json({ users: [] });
      }

      const users = await User.find({
        name: { $regex: q, $options: 'i' },
        isLocked: { $ne: true }
      })
      .select('name email avatar')
      .limit(10)
      .lean();

      res.json({
        users: users.map(u => ({
          id: u._id.toString(),
          name: u.name,
          email: u.email,
          avatar: u.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(u.name)}`
        }))
      });
    } catch (err) {
      next(err);
    }
  });

  // ===== 7. SEARCH MESSAGES =====

  router.get('/messages/search', requireAuth, async (req, res, next) => {
    try {
      const { q, room } = req.query;

      if (!q || q.length < 2) {
        return res.json({ messages: [] });
      }

      const query = {
        text: { $regex: q, $options: 'i' },
        isDeleted: { $ne: true }
      };

      if (room) {
        query.room = room;
      }

      const messages = await Message.find(query)
        .sort({ createdAt: -1 })
        .limit(50)
        .lean();

      const currentUserId = req.user.id;
      res.json({
        messages: messages.map((m) => ({
          id: m._id.toString(),
          userId: m.userId?.toString?.() || m.userId,
          userName: m.userName || 'Ẩn danh',
          userAvatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(m.userName || 'default')}`,
          text: m.text || '',
          room: m.room || 'general',
          timestamp: m.createdAt ? new Date(m.createdAt).toISOString() : new Date().toISOString(),
          isRead: m.readBy?.some(r => r.userId.toString() === currentUserId) || m.userId?.toString() === currentUserId,
          parentMessageId: m.parentMessageId?.toString() || null,
          highlightedText: m.text?.replace(
            new RegExp(`(${q})`, 'gi'),
            '<mark>$1</mark>'
          ) || '',
          reactions: m.reactions || [],
          attachments: m.attachments || []
        }))
      });
    } catch (err) {
      next(err);
    }
  });

  // ===== 8. ROOMS =====

  router.get('/messaging/rooms', requireAuth, async (req, res, next) => {
    try {
      await ensureDefaultRooms();

      const currentUser = req.user;
      const isAdmin = currentUser.role === 'ADMIN';
      const isManager = currentUser.role === 'MANAGER';

      let query = { isDeleted: { $ne: true }, isLocked: { $ne: true } };

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
