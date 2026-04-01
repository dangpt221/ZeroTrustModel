import mongoose from 'mongoose';
import { requireAuth } from '../middleware/auth.js';
import { ChatRoom } from '../models/ChatRoom.js';
import { Message } from '../models/Message.js';
import { User } from '../models/User.js';

// ============ HELPER FUNCTIONS ============

// Find or create 1-on-1 DM room
async function findOrCreateDMRoom(currentUserId, otherUserId) {
  // Ensure both IDs are ObjectIds
  const currentOid = typeof currentUserId === 'string'
    ? new mongoose.Types.ObjectId(currentUserId)
    : currentUserId;
  const otherOid = typeof otherUserId === 'string'
    ? new mongoose.Types.ObjectId(otherUserId)
    : otherUserId;

  let room = await ChatRoom.findOne({
    isDirectMessage: true,
    participants: { $all: [currentOid, otherOid], $size: 2 }
  });

  if (!room) {
    const otherUser = await User.findById(otherOid).lean();
    const currentUser = await User.findById(currentOid).lean();

    room = await ChatRoom.create({
      name: `DM-${currentOid}-${otherOid}`,
      description: `Chat riêng với ${otherUser?.name || 'Unknown'}`,
      type: 'PRIVATE',
      isPrivate: true,
      isDirectMessage: true,
      participants: [currentOid, otherOid],
      participantNames: [currentUser?.name || 'Unknown', otherUser?.name || 'Unknown'],
      relatedUserId: otherOid,
      members: [
        { userId: currentOid, role: 'MEMBER' },
        { userId: otherOid, role: 'MEMBER' }
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
  // Ensure each default room exists (create if not)
  for (const roomDef of DEFAULT_ROOMS) {
    const exists = await ChatRoom.findOne({ name: roomDef.name, isDeleted: { $ne: true } });
    if (!exists) {
      await ChatRoom.create({
        ...roomDef,
        memberCount: 0,
        members: [],
      });
    }
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
            encryptedContent: lastMessage.encryptedContent || null,
            senderDeviceId: lastMessage.senderDeviceId || null,
            senderSignPubKey: lastMessage.senderSignPubKey || null,
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
      const roomId = req.query.room;
      const currentUser = req.user;

      if (roomId) {
        // Verify user has access to this room
        const chatRoom = await ChatRoom.findById(roomId).lean();
        if (!chatRoom) {
          return res.status(404).json({ error: 'Phòng không tồn tại' });
        }
        // Check if user is a member or room has no security code
        const isMember = chatRoom.members?.some(m => m.userId.toString() === currentUser.id);
        const isAdmin = currentUser.role === 'ADMIN' || currentUser.role === 'MANAGER';
        if (chatRoom.joinCode && !isMember && !isAdmin) {
          return res.status(403).json({ error: 'Bạn cần nhập mã bảo mật để tham gia phòng này' });
        }
      }

      const filter = { isDeleted: { $ne: true } };
      if (roomId) filter.room = roomId;

      const msgs = await Message.find(filter)
        .populate('parentMessageId', 'text userName')
        .sort({ createdAt: -1 })
        .limit(100)
        .lean();

      const currentUserId = currentUser.id;
      res.json({
        messages: msgs.map((m) => {
          const isRead = m.readBy?.some(r => r.userId.toString() === currentUserId);
          return {
            id: m._id.toString(),
            userId: m.userId?._id ? m.userId._id.toString() : (m.userId?.toString?.() || m.userId),
            userName: m.userName || 'Ẩn danh',
            userAvatar: m.userId?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(m.userName || 'default')}`,
            text: m.text || '',
            encryptedContent: m.encryptedContent || null,
            senderDeviceId: m.senderDeviceId || null,
            senderSignPubKey: m.senderSignPubKey || null,
            room: m.room || 'general',
            timestamp: m.createdAt ? new Date(m.createdAt).toISOString() : new Date().toISOString(),
            reactions: m.reactions || [],
            isEdited: m.isEdited || false,
            editedAt: m.editedAt ? new Date(m.editedAt).toISOString() : null,
            parentMessageId: m.parentMessageId ? m.parentMessageId._id.toString() : null,
            parentMessageText: m.parentMessageId?.text || null,
            parentMessageUserName: m.parentMessageId?.userName || null,
            replyCount: m.replyCount || 0,
            isRead: isRead || m.userId?.toString() === currentUserId,
            readCount: m.readBy?.length || 0,
            attachments: m.attachments || [],
            hasAttachments: m.hasAttachments || false
          };
        }).reverse()
      });
    } catch (err) {
      next(err);
    }
  });

  // Send a message
  router.post('/messages', requireAuth, async (req, res, next) => {
    try {
      const io = req.app.get('io');
      const { text, encryptedContent, senderDeviceId, room, parentMessageId, senderSignPubKey } = req.body;

      if (!text?.trim() && (!encryptedContent || encryptedContent.length === 0)) {
        return res.status(400).json({ error: 'Message text or encrypted content is required' });
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
        text: text?.trim() || '',
        encryptedContent,
        senderDeviceId,
        senderSignPubKey,
        room: room || 'general',
        roomId: room || null,
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

      const sender = await User.findById(req.user.id).select('avatar').lean();
      const userAvatar = sender?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(req.user.name || 'default')}`;

      const messageData = {
        id: msg._id.toString(),
        userId: msg.userId?.toString?.() || msg.userId,
        userName: msg.userName || 'Ẩn danh',
        userAvatar,
        text: msg.text || '',
        encryptedContent: msg.encryptedContent || null,
        senderDeviceId: msg.senderDeviceId || null,
        senderSignPubKey: msg.senderSignPubKey || null,
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

        // Send notification for DM messages - notify recipient via socket
        if (chatRoom && chatRoom.isDirectMessage) {
          // Find the other participant
          const otherParticipantId = chatRoom.participants.find(
            p => p.toString() !== req.user.id
          );

          if (otherParticipantId) {
            // Notify the recipient via socket
            io.to(`user_${otherParticipantId.toString()}`).emit('new_admin_message_notification', {
              fromUserId: req.user.id,
              fromUserName: req.user.name,
              fromUserRole: req.user.role,
              messageId: msg._id.toString(),
              conversationId: room,
              preview: text.trim().substring(0, 50)
            });

            // Also notify admins when staff or manager sends a DM (socket only, no DB notification)
            if (req.user.role !== 'ADMIN') {
              const admins = await User.find({ role: 'ADMIN' }).select('_id').lean();
              for (const admin of admins) {
                io.to(`user_${admin._id.toString()}`).emit('new_admin_message_notification', {
                  fromUserId: req.user.id,
                  fromUserName: req.user.name,
                  fromUserRole: req.user.role,
                  messageId: msg._id.toString(),
                  conversationId: room,
                  preview: text.trim().substring(0, 50)
                });
              }
            }
          }
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
      })
        .populate('userId', 'avatar')
        .sort({ createdAt: 1 })
        .lean();

      const currentUserId = req.user.id;
      res.json(
        replies.map((m) => ({
          id: m._id.toString(),
          userId: m.userId?._id ? m.userId._id.toString() : (m.userId?.toString?.() || m.userId),
          userName: m.userName || 'Ẩn danh',
          userAvatar: m.userId?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(m.userName || 'default')}`,
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
        .populate('userId', 'avatar')
        .sort({ createdAt: -1 })
        .limit(50)
        .lean();

      const currentUserId = req.user.id;
      res.json({
        messages: messages.map((m) => ({
          id: m._id.toString(),
          userId: m.userId?._id ? m.userId._id.toString() : (m.userId?.toString?.() || m.userId),
          userName: m.userName || 'Ẩn danh',
          userAvatar: m.userId?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(m.userName || 'default')}`,
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
        })),
      });
    } catch (err) {
      next(err);
    }
  });

  // ===== 9. ROOMS =====
  router.get('/messaging/rooms', requireAuth, async (req, res, next) => {
    try {
      await ensureDefaultRooms();

      const currentUser = req.user;
      const isManager = currentUser.role === 'MANAGER';

      let query = { isDeleted: { $ne: true }, isLocked: { $ne: true } };

      if (!isManager && currentUser.departmentId) {
        query = {
          isDeleted: { $ne: true },
          isLocked: { $ne: true },
          $or: [
            { isSystemRoom: true },
            { departmentId: currentUser.departmentId }
          ]
        };
      }

      const allRooms = await ChatRoom.find(query)
        .sort({ isSystemRoom: -1, name: 1 })
        .lean();

      // Filter: user must be a member OR room has no security code OR same department
      const rooms = allRooms.filter(r => {
        // System rooms are visible to all
        if (r.isSystemRoom) return true;
        // Rooms without security code are visible
        if (!r.joinCode) return true;
        // For rooms with security code, check if user is a member
        if (r.members && r.members.some(m => m.userId.toString() === currentUser.id)) return true;
        // Rooms with security code are visible to same department (but need code to enter)
        if (r.departmentId && r.departmentId.toString() === currentUser.departmentId?.toString()) return true;
        return false;
      });

      res.json({
        rooms: rooms.map((r) => ({
          id: r._id.toString(),
          name: r.name,
          description: r.description || '',
          type: 'channel',
          isPinned: r.isSystemRoom || false,
          unread: 0,
          departmentId: r.departmentId?.toString() || null,
          isPrivate: r.isPrivate || r.joinCode != null,
          hasJoinCode: r.joinCode != null,
          isMember: r.members?.some(m => m.userId.toString() === currentUser.id) || false,
        })),
      });
    } catch (err) {
      next(err);
    }
  });

  // Create room
  router.post('/messaging/rooms', requireAuth, async (req, res, next) => {
    try {
      const currentUser = req.user;
      const { name, description, hasSecurityCode, securityCode } = req.body;

      if (!name?.trim()) {
        return res.status(400).json({ success: false, message: 'Tên phòng không được để trống' });
      }

      const room = await ChatRoom.create({
        name: name.trim(),
        description: description?.trim() || '',
        type: 'GROUP',
        departmentId: currentUser.departmentId,
        members: [{ userId: currentUser.id, role: 'ADMIN' }],
        memberCount: 1,
        isSystemRoom: false,
        isPrivate: hasSecurityCode || false,
        joinCode: hasSecurityCode ? securityCode : null
      });

      res.status(201).json({
        success: true,
        room: {
          id: room._id.toString(),
          name: room.name,
          description: room.description,
          type: 'channel',
          isPinned: false,
          unread: 0,
          departmentId: room.departmentId?.toString() || null,
          isPrivate: room.isPrivate,
          hasJoinCode: !!room.joinCode
        }
      });
    } catch (err) {
      next(err);
    }
  });

  // Join room with security code
  router.post('/messaging/rooms/:roomId/join', requireAuth, async (req, res, next) => {
    try {
      const { roomId } = req.params;
      const { securityCode } = req.body;
      const currentUser = req.user;

      const room = await ChatRoom.findById(roomId);
      if (!room) {
        return res.status(404).json({ success: false, message: 'Phòng không tồn tại' });
      }

      // Check security code
      if (room.joinCode && room.joinCode !== securityCode) {
        return res.status(403).json({ success: false, message: 'Mã bảo mật không đúng' });
      }

      // Check if already a member
      const alreadyMember = room.members?.some(m => m.userId.toString() === currentUser.id);
      if (alreadyMember) {
        return res.json({
          success: true,
          room: {
            id: room._id.toString(),
            name: room.name,
            description: room.description,
            type: 'channel',
            isPinned: false,
            unread: 0,
            departmentId: room.departmentId?.toString() || null,
            isPrivate: room.isPrivate,
            hasJoinCode: !!room.joinCode
          }
        });
      }

      // Add user to room
      room.members = room.members || [];
      room.members.push({ userId: currentUser.id, role: 'MEMBER' });
      room.memberCount = (room.memberCount || 0) + 1;
      await room.save();

      res.json({
        success: true,
        room: {
          id: room._id.toString(),
          name: room.name,
          description: room.description,
          type: 'channel',
          isPinned: false,
          unread: 0,
          departmentId: room.departmentId?.toString() || null,
          isPrivate: room.isPrivate,
          hasJoinCode: !!room.joinCode
        }
      });
    } catch (err) {
      next(err);
    }
  });

  // Get room members for @mention
  router.get('/messaging/rooms/:roomId/members', requireAuth, async (req, res, next) => {
    try {
      const { roomId } = req.params;
      const chatRoom = await ChatRoom.findById(roomId).lean();

      if (!chatRoom) {
        return res.status(404).json({ error: 'Room not found' });
      }

      const members = [];
      if (chatRoom.members && chatRoom.members.length > 0) {
        const userIds = chatRoom.members.map(m => m.userId);
        const users = await User.find({ _id: { $in: userIds } }).select('name email avatar').lean();
        users.forEach(u => {
          const member = chatRoom.members.find(m => m.userId.toString() === u._id.toString());
          members.push({
            id: u._id.toString(),
            name: u.name,
            email: u.email,
            avatar: u.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(u.name)}`,
            role: member?.role || 'MEMBER'
          });
        });
      } else if (chatRoom.participants && chatRoom.participants.length > 0) {
        const users = await User.find({ _id: { $in: chatRoom.participants } }).select('name email avatar').lean();
        users.forEach(u => {
          members.push({
            id: u._id.toString(),
            name: u.name,
            email: u.email,
            avatar: u.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(u.name)}`,
            role: 'MEMBER'
          });
        });
      }

      res.json({ members });
    } catch (err) {
      next(err);
    }
  });

  // Delete room
  router.delete('/messaging/rooms/:roomId', requireAuth, async (req, res, next) => {
    try {
      const { roomId } = req.params;
      const currentUser = req.user;

      const chatRoom = await ChatRoom.findById(roomId);
      if (!chatRoom) {
        return res.status(404).json({ success: false, message: 'Phòng không tồn tại' });
      }

      const isParticipant = chatRoom.participants.some(p => p.toString() === currentUser.id.toString());
      if (currentUser.role !== 'ADMIN' && currentUser.role !== 'MANAGER' && !(chatRoom.isDirectMessage && isParticipant)) {
        return res.status(403).json({ success: false, message: 'Bạn không có quyền xóa cuộc trò chuyện này' });
      }

      if (chatRoom.isDirectMessage) {
        // Completely destroy DM history and Room for a clean slate
        await mongoose.model('Message').deleteMany({ room: roomId });
        await ChatRoom.deleteOne({ _id: roomId });
      } else {
        // Soft delete for project channels
        chatRoom.isDeleted = true;
        await chatRoom.save();
      }

      // Notify users to update their local lists
      req.app.get('io').to(roomId).emit('room_deleted', roomId);

      res.json({ success: true, message: 'Đã xóa hộp thoại thành công' });
    } catch (err) {
      next(err);
    }
  });
}
