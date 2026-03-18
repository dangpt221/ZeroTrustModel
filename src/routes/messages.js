import { requireAuth } from '../middleware/auth.js';
import { Message } from '../models/Message.js';
import { ChatRoom } from '../models/ChatRoom.js';
import { User } from '../models/User.js';
import mongoose from 'mongoose';

// ============ HELPER FUNCTIONS ============

// Find or create 1-on-1 DM room
async function findOrCreateDMRoom(currentUserId, otherUserId) {
  // Try to find existing DM room
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

      // Get DM rooms
      const dmRooms = await ChatRoom.find({
        isDirectMessage: true,
        participants: currentUserId,
        isDeleted: { $ne: true }
      }).sort({ lastMessageAt: -1 }).lean();

      // Get last message for each room and unread count
      const conversations = await Promise.all(dmRooms.map(async (room) => {
        const lastMessage = await Message.findOne({
          room: room._id.toString(),
          isDeleted: { $ne: true }
        }).sort({ createdAt: -1 }).lean();

        const otherParticipantId = room.participants.find(
          p => p.toString() !== currentUserId.toString()
        );

        // Count unread messages
        const unreadCount = await Message.countDocuments({
          room: room._id.toString(),
          'readBy.userId': { $ne: currentUserId },
          userId: { $ne: currentUserId },
          isDeleted: { $ne: true }
        });

        // Get other user info
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

      // Get other user info
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

  // ===== 2. MESSAGES WITH THREADING, REACTIONS, READ RECEIPTS =====

  // Get messages for a room (with threading support)
  router.get('/messages', requireAuth, async (req, res, next) => {
    try {
      const room = req.query.room;
      const filter = { isDeleted: { $ne: true } };
      if (room) filter.room = room;

      const msgs = await Message.find(filter)
        .sort({ createdAt: -1 })  // Most recent first
        .limit(100)
        .lean();

      // Transform messages for frontend
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
            // Threading
            parentMessageId: m.parentMessageId?.toString() || null,
            replyCount: m.replyCount || 0,
            // Read receipts
            isRead: isRead || m.userId?.toString() === currentUserId,
            readCount: m.readBy?.length || 0,
            // Attachments
            attachments: m.attachments || [],
            hasAttachments: m.hasAttachments || false
          };
        }).reverse()  // Oldest first for display
      );
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

  // Send a message (with threading and attachments)
  router.post('/messages', requireAuth, async (req, res, next) => {
    try {
      const io = req.app.get('io');
      const { text, room, parentMessageId, attachments } = req.body;

      if (!text?.trim() && !attachments?.length) {
        return res.status(400).json({ error: 'Message text or attachments required' });
      }

      // Get room info for participants
      const chatRoom = await ChatRoom.findById(room);

      // Parse @mentions from text
      const mentionRegex = /@(\w+\s\w+)/g;
      const mentions = [];
      let match;
      while ((match = mentionRegex.exec(text)) !== null) {
        mentions.push(match[1]);
      }

      // Create message
      const msg = await Message.create({
        userId: req.user.id,
        userName: req.user.name,
        text: text?.trim() || '',
        room: room || 'general',
        attachments: attachments || [],
        hasAttachments: (attachments && attachments.length > 0) || false,
        parentMessageId: parentMessageId || null,
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      });

      // Update parent message reply count
      if (parentMessageId) {
        await Message.findByIdAndUpdate(parentMessageId, {
          $inc: { replyCount: 1 }
        });
      }

      // Update room last message
      if (chatRoom) {
        await ChatRoom.findByIdAndUpdate(room, {
          lastMessageAt: new Date(),
          $inc: { messageCount: 1 }
        });
      }

      // Emit to room
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
        isRead: true, // Sender always "read" their own message
        readCount: 1,
        attachments: msg.attachments || [],
        hasAttachments: msg.hasAttachments || false,
        mentions
      };

      if (io) {
        io.to(msg.room).emit('receive_message', messageData);

        // Notify mentioned users
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

  // ===== 3. REACTIONS =====

  // Add reaction to message
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

      // Check if user already reacted with this emoji
      const existingReaction = message.reactions.find(
        r => r.userId.toString() === req.user.id && r.emoji === emoji
      );

      if (existingReaction) {
        // Remove reaction
        message.reactions = message.reactions.filter(
          r => !(r.userId.toString() === req.user.id && r.emoji === emoji)
        );
      } else {
        // Add reaction
        message.reactions.push({
          userId: req.user.id,
          emoji,
          createdAt: new Date()
        });
      }

      await message.save();

      // Emit update
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

  // ===== 4. READ RECEIPTS =====

  // Mark message as read
  router.post('/messages/:messageId/read', requireAuth, async (req, res, next) => {
    try {
      const io = req.app.get('io');
      const { messageId } = req.params;
      const currentUserId = req.user.id;

      const message = await Message.findById(messageId);
      if (!message) {
        return res.status(404).json({ error: 'Message not found' });
      }

      // Check if already read
      const alreadyRead = message.readBy?.some(r => r.userId.toString() === currentUserId);

      if (!alreadyRead) {
        message.readBy = message.readBy || [];
        message.readBy.push({
          userId: currentUserId,
          readAt: new Date()
        });
        await message.save();

        // Emit read receipt
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

  // Mark all messages in room as read
  router.post('/messages/room/:roomId/read-all', requireAuth, async (req, res, next) => {
    try {
      const io = req.app.get('io');
      const { roomId } = req.params;
      const currentUserId = req.user.id;

      // Mark all unread messages in room as read
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

      // Emit bulk read receipt
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

  // ===== 5. TYPING INDICATOR (Socket only - no API needed) =====

  // ===== 6. MESSAGE THREADING (already implemented above) =====

  // ===== 7. @MENTIONS - Get users for mention autocomplete =====

  router.get('/messaging/users/search', requireAuth, async (req, res, next) => {
    try {
      const { q } = req.query;

      if (!q || q.length < 2) {
        return res.json({ users: [] });
      }

      // Search users by name
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

  // ===== 8. SEARCH MESSAGES =====

  router.get('/messages/search', requireAuth, async (req, res, next) => {
    try {
      const { q, room } = req.query;

      if (!q || q.length < 2) {
        return res.json({ messages: [] });
      }

      // Build search query
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
        messages: messages.map(m => ({
          id: m._id.toString(),
          userId: m.userId?.toString?.() || m.userId,
          userName: m.userName || 'Ẩn danh',
          userAvatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(m.userName || 'default')}`,
          text: m.text || '',
          room: m.room || 'general',
          timestamp: m.createdAt ? new Date(m.createdAt).toISOString() : new Date().toISOString(),
          isRead: m.readBy?.some(r => r.userId.toString() === currentUserId) || m.userId?.toString() === currentUserId,
          parentMessageId: m.parentMessageId?.toString() || null,
          // Highlight matched text
          highlightedText: m.text?.replace(
            new RegExp(`(${q})`, 'gi'),
            '<mark>$1</mark>'
          ) || ''
        }))
      });
    } catch (err) {
      next(err);
    }
  });

  // ===== EXISTING ROOMS ROUTE =====

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
