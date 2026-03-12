import { Message } from '../models/Message.js';

export function registerSocketHandlers(io) {
  io.on('connection', (socket) => {
    // User joins their personal room for notifications
    socket.on('join_user_room', (userId) => {
      socket.join(`user_${userId}`);
    });

    socket.on('join_room', (room) => {
      socket.join(room);
    });

    socket.on('send_message', async (payload) => {
      try {
        const msg = await Message.create({
          userId: payload.userId,
          userName: payload.userName,
          text: payload.text,
          room: payload.room || 'general',
        });

        const userAvatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(payload.userName || 'default')}`;

        const data = {
          id: msg._id.toString(),
          userId: msg.userId?.toString?.() || msg.userId,
          userName: msg.userName || 'Ẩn danh',
          userAvatar,
          text: msg.text || '',
          room: msg.room || 'general',
          timestamp: msg.createdAt ? new Date(msg.createdAt).toISOString() : new Date().toISOString(),
          reactions: [],
        };

        io.to(msg.room).emit('receive_message', data);
      } catch (err) {
        console.error('Socket message error', err);
      }
    });
  });
}


