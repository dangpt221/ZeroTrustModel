import { Message } from '../models/Message.js';
import { User } from '../models/User.js';

export function registerSocketHandlers(io) {
  io.on('connection', (socket) => {
    const userId = socket.handshake.query.userId || socket.handshake.auth.userId;
    const userName = socket.handshake.query.userName || socket.handshake.auth.userName;

    // User joins their personal room for notifications
    if (userId) {
      socket.join(`user_${userId}`);
    }

    socket.on('join_room', (room) => {
      socket.join(room);
      socket.to(room).emit('user_joined_room', { userId, userName, room });
    });

    socket.on('leave_room', (room) => {
      socket.leave(room);
      socket.to(room).emit('user_left_room', { userId, userName, room });
    });

    // ===== TYPING INDICATOR =====
    socket.on('typing_start', ({ room, userId, userName }) => {
      socket.to(room).emit('user_typing', { room, userId, userName, isTyping: true });
    });

    socket.on('typing_stop', ({ room, userId, userName }) => {
      socket.to(room).emit('user_typing', { room, userId, userName, isTyping: false });
    });

    // ===== SEND MESSAGE (with attachments support) =====
    socket.on('send_message', async (payload) => {
      try {
        const { userId, userName, text, room, parentMessageId, attachments } = payload;

        // Parse @mentions
        const mentionRegex = /@(\w+\s\w+)/g;
        const mentions = [];
        let match;
        while ((match = mentionRegex.exec(text)) !== null) {
          mentions.push(match[1]);
        }

        const msg = await Message.create({
          userId,
          userName,
          text,
          room: room || 'general',
          parentMessageId: parentMessageId || null,
          attachments: attachments || [],
          hasAttachments: (attachments && attachments.length > 0) || false
        });

        // Update parent message reply count
        if (parentMessageId) {
          await Message.findByIdAndUpdate(parentMessageId, {
            $inc: { replyCount: 1 }
          });
        }

        const userAvatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(userName || 'default')}`;

        const data = {
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
          isRead: false,
          readCount: 0,
          attachments: msg.attachments || [],
          hasAttachments: msg.hasAttachments || false,
          mentions
        };

        io.to(msg.room).emit('receive_message', data);

        // Notify mentioned users
        if (mentions.length > 0) {
          const mentionedUsers = await User.find({ name: { $in: mentions } }).select('_id').lean();
          mentionedUsers.forEach(u => {
            io.to(`user_${u._id.toString()}`).emit('mentioned', {
              message: data,
              mentionedBy: userName
            });
          });
        }
      } catch (err) {
        console.error('Socket message error', err);
      }
    });

    // ===== REACTIONS =====
    socket.on('add_reaction', async ({ messageId, emoji, userId, userName, room }) => {
      try {
        const message = await Message.findById(messageId);
        if (!message) return;

        const existingReaction = message.reactions.find(
          r => r.userId.toString() === userId && r.emoji === emoji
        );

        if (existingReaction) {
          message.reactions = message.reactions.filter(
            r => !(r.userId.toString() === userId && r.emoji === emoji)
          );
        } else {
          message.reactions.push({
            userId,
            emoji,
            createdAt: new Date()
          });
        }

        await message.save();
        io.to(room).emit('reaction_updated', { messageId, reactions: message.reactions });
      } catch (err) {
        console.error('Socket reaction error', err);
      }
    });

    // ===== READ RECEIPTS =====
    socket.on('mark_read', async ({ messageId, userId, room }) => {
      try {
        const message = await Message.findById(messageId);
        if (!message) return;

        const alreadyRead = message.readBy?.some(r => r.userId.toString() === userId);

        if (!alreadyRead) {
          message.readBy = message.readBy || [];
          message.readBy.push({ userId, readAt: new Date() });
          await message.save();

          io.to(room).emit('message_read', {
            messageId,
            userId,
            readAt: new Date().toISOString(),
            readCount: message.readBy.length
          });
        }
      } catch (err) {
        console.error('Socket read receipt error', err);
      }
    });

    socket.on('disconnect', () => {});
  });
}


