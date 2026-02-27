import { Notification } from '../models/Notification.js';
import { User } from '../models/User.js';

// Admin: Gửi thông báo cho user
export async function createNotification(req, res) {
  try {
    const { userId, title, message, type, priority } = req.body;
    
    // Validate user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User không tồn tại' });
    }

    const notification = await Notification.create({
      userId,
      title,
      message,
      type: type || 'INFO',
      priority: priority || 'NORMAL'
    });

    // Emit socket event for real-time notification
    const io = req.app.get('io');
    if (io) {
      io.to(`user_${userId}`).emit('notification', notification);
    }

    res.status(201).json(notification);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

// Admin: Gửi thông báo cho nhiều user
export async function broadcastNotification(req, res) {
  try {
    const { userIds, title, message, type, priority } = req.body;

    const notifications = await Notification.insertMany(
      userIds.map(userId => ({
        userId,
        title,
        message,
        type: type || 'INFO',
        priority: priority || 'NORMAL'
      }))
    );

    // Emit to all targeted users
    const io = req.app.get('io');
    if (io) {
      userIds.forEach(userId => {
        io.to(`user_${userId}`).emit('notification', { 
          title, message, type, priority 
        });
      });
    }

    res.status(201).json({ 
      message: `Đã gửi thông báo cho ${notifications.length} người dùng`,
      count: notifications.length 
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

// Admin: Lấy tất cả thông báo đã gửi
export async function getAllNotifications(req, res) {
  try {
    const notifications = await Notification.find()
      .populate('userId', 'name email')
      .sort({ createdAt: -1 })
      .limit(100);
    
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

// User: Lấy thông báo của mình
export async function getMyNotifications(req, res) {
  try {
    const notifications = await Notification.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .limit(50);
    
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

// User: Đánh dấu đã đọc
export async function markAsRead(req, res) {
  try {
    const { notificationId } = req.params;
    
    await Notification.findOneAndUpdate(
      { _id: notificationId, userId: req.user.id },
      { isRead: true }
    );

    res.json({ message: 'Đã đánh dấu đã đọc' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

// User: Đánh dấu tất cả đã đọc
export async function markAllAsRead(req, res) {
  try {
    await Notification.updateMany(
      { userId: req.user.id, isRead: false },
      { isRead: true }
    );

    res.json({ message: 'Đã đánh dấu tất cả đã đọc' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

// User: Lấy số thông báo chưa đọc
export async function getUnreadCount(req, res) {
  try {
    const count = await Notification.countDocuments({ 
      userId: req.user.id, 
      isRead: false 
    });
    
    res.json({ unreadCount: count });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

