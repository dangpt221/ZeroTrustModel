import { Message } from "../models/Message.js";
import { ChatRoom } from "../models/ChatRoom.js";
import { ChatPolicy } from "../models/ChatPolicy.js";
import { AuditLog } from "../models/AuditLog.js";
import { User } from "../models/User.js";
import { getClientIP, parseDeviceFromUserAgent } from "../middleware/securityMiddleware.js";

// Helper: Transform to client format
function toClientMessage(msg) {
  return {
    id: msg._id.toString(),
    userId: msg.userId?.toString(),
    userName: msg.userName,
    text: msg.text,
    attachments: msg.attachments || [],
    roomId: msg.roomId?.toString(),
    room: msg.room,
    timestamp: msg.createdAt ? new Date(msg.createdAt).toISOString() : new Date().toISOString(),
    reactions: msg.reactions || [],
    isEdited: msg.isEdited || false,
    editedAt: msg.editedAt ? new Date(msg.editedAt).toISOString() : null,
    parentMessageId: msg.parentMessageId?.toString() || null,
    replyCount: msg.replyCount || 0,
    isRead: false,
    readCount: msg.readBy?.length || 0,
    hasAttachments: msg.hasAttachments || false,
    mentions: [],
    // Keep original fields for compatibility
    isDeleted: msg.isDeleted || false,
    isHidden: msg.isHidden || false,
    isSystemMessage: msg.isSystemMessage || false,
    deletionReason: msg.deletionReason || '',
    deletedAt: msg.deletedAt,
    deletedBy: msg.deletedBy?.toString(),
    createdAt: msg.createdAt ? new Date(msg.createdAt).toISOString() : null,
    updatedAt: msg.updatedAt ? new Date(msg.updatedAt).toISOString() : null
  };
}

function toClientRoom(room, includeJoinCode = false) {
  return {
    id: room._id.toString(),
    name: room.name,
    description: room.description,
    type: room.type,
    isPrivate: room.isPrivate || false,
    isSystemRoom: room.isSystemRoom || false,
    createdBy: room.createdBy?.toString(),
    departmentId: room.departmentId?.toString(),
    projectId: room.projectId?.toString(),
    members: room.members?.map(m => ({
      userId: m.userId?.toString(),
      role: m.role,
      joinedAt: m.joinedAt,
      leftAt: m.leftAt
    })) || [],
    memberCount: room.memberCount || 0,
    isLocked: room.isLocked || false,
    lockedAt: room.lockedAt,
    lockedBy: room.lockedBy?.toString(),
    lockReason: room.lockReason || '',
    allowFileUpload: room.allowFileUpload !== false,
    maxFileSize: room.maxFileSize || 10 * 1024 * 1024,
    autoDeleteDays: room.autoDeleteDays || 0,
    maxMessageLength: room.maxMessageLength || 5000,
    lastMessageAt: room.lastMessageAt,
    messageCount: room.messageCount || 0,
    joinCode: includeJoinCode ? room.joinCode : undefined,
    createdAt: room.createdAt,
    updatedAt: room.updatedAt
  };
}

// Get all chat rooms with filters
export const getAllRooms = async (req, res, next) => {
  try {
    const {
      type,
      search,
      isLocked,
      department,
      page = 1,
      limit = 20
    } = req.query;

    const query = { isDeleted: { $ne: true } };

    if (type) query.type = type;
    if (isLocked !== undefined) query.isLocked = isLocked === 'true';
    if (department) query.departmentId = department;
    if (search) {
      query.$text = { $search: search };
    }

    // Role-based filtering
    const userRole = req.user.role;
    if (userRole === 'MANAGER') {
      query.$or = [
        { departmentId: req.user.departmentId },
        { type: { $in: ['GROUP', 'PROJECT'] } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [rooms, total] = await Promise.all([
      ChatRoom.find(query)
        .populate('createdBy', 'name email')
        .populate('departmentId', 'name')
        .sort({ lastActivityAt: -1, createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      ChatRoom.countDocuments(query)
    ]);

    res.json({
      rooms: rooms.map(toClientRoom),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (err) {
    next(err);
  }
};

// Get room by ID with members
export const getRoomById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const room = await ChatRoom.findById(id)
      .populate('createdBy', 'name email')
      .populate('departmentId', 'name')
      .populate('members.userId', 'name email avatar')
      .lean();

    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    // Audit log
    await AuditLog.create({
      userId: req.user.id,
      userName: req.user.name,
      action: 'CHAT_ROOM_VIEW',
      details: `Viewed chat room: ${room.name}`,
      ip: getClientIP(req),
      device: parseDeviceFromUserAgent(req.headers['user-agent']),
      status: 'SUCCESS',
      riskLevel: 'LOW'
    });

    res.json(toClientRoom(room));
  } catch (err) {
    next(err);
  }
};

// Get messages from a room
export const getRoomMessages = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      page = 1,
      limit = 50,
      startDate,
      endDate,
      userId
    } = req.query;

    const query = { room: id, isDeleted: { $ne: true } };

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }
    if (userId) query.userId = userId;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [messages, total] = await Promise.all([
      Message.find(query)
        .populate('userId', 'name email avatar')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Message.countDocuments(query)
    ]);

    res.json({
      messages: messages.map(toClientMessage),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (err) {
    next(err);
  }
};

// Search messages
export const searchMessages = async (req, res, next) => {
  try {
    const {
      keyword,
      roomId,
      userId,
      startDate,
      endDate,
      page = 1,
      limit = 50
    } = req.query;

    const query = { isDeleted: { $ne: true } };

    if (keyword) {
      query.$text = { $search: keyword };
    }
    if (roomId) query.room = roomId;
    if (userId) query.userId = userId;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [messages, total] = await Promise.all([
      Message.find(query)
        .populate('userId', 'name email avatar')
        .populate('roomId', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Message.countDocuments(query)
    ]);

    // Audit log for search
    await AuditLog.create({
      userId: req.user.id,
      userName: req.user.name,
      action: 'CHAT_SEARCH',
      details: `Searched messages: ${keyword || 'filters applied'}`,
      ip: getClientIP(req),
      device: parseDeviceFromUserAgent(req.headers['user-agent']),
      status: 'SUCCESS',
      riskLevel: 'LOW'
    });

    res.json({
      messages: messages.map(toClientMessage),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (err) {
    next(err);
  }
};

// Delete (hide) a message
export const deleteMessage = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const message = await Message.findById(id);
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    // Soft delete - hide from users but keep for audit
    message.isDeleted = true;
    message.isHidden = true;
    message.deletedAt = new Date();
    message.deletedBy = req.user.id;
    message.deletionReason = reason || 'Admin deleted';
    await message.save();

    // Audit log
    await AuditLog.create({
      userId: req.user.id,
      userName: req.user.name,
      action: 'CHAT_MESSAGE_DELETE',
      details: `Deleted message in room ${message.room}: ${reason || 'No reason provided'}`,
      ip: getClientIP(req),
      device: parseDeviceFromUserAgent(req.headers['user-agent']),
      status: 'SUCCESS',
      riskLevel: 'MEDIUM'
    });

    res.json({ success: true, message: 'Message deleted successfully' });
  } catch (err) {
    next(err);
  }
};

// Lock/Unlock a room
export const toggleRoomLock = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { lock, reason } = req.body;

    const room = await ChatRoom.findById(id);
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    room.isLocked = lock;
    room.lockedAt = lock ? new Date() : null;
    room.lockedBy = lock ? req.user.id : null;
    room.lockReason = lock ? (reason || 'Locked by admin') : '';
    await room.save();

    // Audit log
    await AuditLog.create({
      userId: req.user.id,
      userName: req.user.name,
      action: lock ? 'CHAT_ROOM_LOCK' : 'CHAT_ROOM_UNLOCK',
      details: `${lock ? 'Locked' : 'Unlocked'} chat room: ${room.name}`,
      ip: getClientIP(req),
      device: parseDeviceFromUserAgent(req.headers['user-agent']),
      status: 'SUCCESS',
      riskLevel: 'MEDIUM'
    });

    res.json({ success: true, message: lock ? 'Room locked' : 'Room unlocked', room: toClientRoom(room) });
  } catch (err) {
    next(err);
  }
};

// Add member to room
export const addRoomMember = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { userId, role = 'MEMBER' } = req.body;

    const room = await ChatRoom.findById(id);
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    // Check if already a member
    const existingMember = room.members.find(m => m.userId.toString() === userId && !m.leftAt);
    if (existingMember) {
      return res.status(400).json({ message: 'User is already a member' });
    }

    room.members.push({
      userId,
      role,
      joinedAt: new Date()
    });
    room.memberCount = room.members.filter(m => !m.leftAt).length;
    await room.save();

    // Audit log
    await AuditLog.create({
      userId: req.user.id,
      userName: req.user.name,
      action: 'CHAT_MEMBER_ADD',
      details: `Added member to room: ${room.name}`,
      ip: getClientIP(req),
      device: parseDeviceFromUserAgent(req.headers['user-agent']),
      status: 'SUCCESS',
      riskLevel: 'MEDIUM'
    });

    res.json({ success: true, room: toClientRoom(room) });
  } catch (err) {
    next(err);
  }
};

// Remove member from room
export const removeRoomMember = async (req, res, next) => {
  try {
    const { id, userId } = req.params;

    const room = await ChatRoom.findById(id);
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    const memberIndex = room.members.findIndex(m => m.userId.toString() === userId);
    if (memberIndex === -1) {
      return res.status(400).json({ message: 'User is not a member' });
    }

    room.members[memberIndex].leftAt = new Date();
    room.memberCount = room.members.filter(m => !m.leftAt).length;
    await room.save();

    // Audit log
    await AuditLog.create({
      userId: req.user.id,
      userName: req.user.name,
      action: 'CHAT_MEMBER_REMOVE',
      details: `Removed member from room: ${room.name}`,
      ip: getClientIP(req),
      device: parseDeviceFromUserAgent(req.headers['user-agent']),
      status: 'SUCCESS',
      riskLevel: 'MEDIUM'
    });

    res.json({ success: true, room: toClientRoom(room) });
  } catch (err) {
    next(err);
  }
};

// Send system message to room
export const sendSystemMessage = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { text, attachments } = req.body;

    const room = await ChatRoom.findById(id);
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    const message = await Message.create({
      userId: req.user.id,
      userName: 'System',
      text,
      room: id,
      roomId: id,
      attachments: attachments || [],
      isSystemMessage: true
    });

    // Update room activity
    room.lastMessageAt = new Date();
    room.lastActivityAt = new Date();
    room.messageCount = (room.messageCount || 0) + 1;
    await room.save();

    // Audit log
    await AuditLog.create({
      userId: req.user.id,
      userName: req.user.name,
      action: 'CHAT_SYSTEM_MESSAGE',
      details: `Sent system message to room: ${room.name}`,
      ip: getClientIP(req),
      device: parseDeviceFromUserAgent(req.headers['user-agent']),
      status: 'SUCCESS',
      riskLevel: 'MEDIUM'
    });

    res.status(201).json(toClientMessage(message));
  } catch (err) {
    next(err);
  }
};

// Get chat statistics
export const getChatStats = async (req, res, next) => {
  try {
    const [
      totalRooms,
      totalMessages,
      activeRooms,
      lockedRooms,
      messagesToday,
      messagesThisWeek
    ] = await Promise.all([
      ChatRoom.countDocuments({ isDeleted: { $ne: true } }),
      Message.countDocuments({ isDeleted: { $ne: true } }),
      ChatRoom.countDocuments({ isDeleted: { $ne: true }, isLocked: false }),
      ChatRoom.countDocuments({ isLocked: true }),
      Message.countDocuments({
        isDeleted: { $ne: true },
        createdAt: { $gte: new Date().setHours(0, 0, 0, 0) }
      }),
      Message.countDocuments({
        isDeleted: { $ne: true },
        createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
      })
    ]);

    // Messages by day for last 7 days
    const messagesByDay = await Message.aggregate([
      {
        $match: {
          isDeleted: { $ne: true },
          createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json({
      totalRooms,
      totalMessages,
      activeRooms,
      lockedRooms,
      messagesToday,
      messagesThisWeek,
      messagesByDay
    });
  } catch (err) {
    next(err);
  }
};

// Export chat logs
export const exportChatLogs = async (req, res, next) => {
  try {
    const { roomId, startDate, endDate, format = 'json' } = req.query;

    const query = { isDeleted: { $ne: true } };
    if (roomId) query.room = roomId;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const messages = await Message.find(query)
      .populate('userId', 'name email')
      .populate('roomId', 'name')
      .sort({ createdAt: -1 })
      .limit(10000)
      .lean();

    // Audit log
    await AuditLog.create({
      userId: req.user.id,
      userName: req.user.name,
      action: 'CHAT_EXPORT',
      details: `Exported chat logs: ${messages.length} messages`,
      ip: getClientIP(req),
      device: parseDeviceFromUserAgent(req.headers['user-agent']),
      status: 'SUCCESS',
      riskLevel: 'MEDIUM'
    });

    if (format === 'csv') {
      const csvHeader = 'Date,Room,User,Message,Attachments\n';
      const csvRows = messages.map(m =>
        `"${m.createdAt}","${m.room || ''}","${m.userName}","${(m.text || '').replace(/"/g, '""')}","${(m.attachments?.length || 0)}"`
      ).join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=chat_logs_${Date.now()}.csv`);
      res.send(csvHeader + csvRows);
    } else {
      res.json({
        messages: messages.map(toClientMessage),
        exportedAt: new Date(),
        total: messages.length
      });
    }
  } catch (err) {
    next(err);
  }
};

// Get chat policy
export const getChatPolicy = async (req, res, next) => {
  try {
    let policy = await ChatPolicy.findOne({ name: 'default' }).lean();

    if (!policy) {
      // Create default policy
      policy = await ChatPolicy.create({
        name: 'default',
        description: 'Default chat policy'
      });
    }

    res.json(policy);
  } catch (err) {
    next(err);
  }
};

// Update chat policy
export const updateChatPolicy = async (req, res, next) => {
  try {
    const {
      messageRetention,
      fileUpload,
      restrictions,
      moderation,
      audit
    } = req.body;

    let policy = await ChatPolicy.findOne({ name: 'default' });

    if (!policy) {
      policy = new ChatPolicy({ name: 'default' });
    }

    if (messageRetention) {
      policy.messageRetention = { ...policy.messageRetention, ...messageRetention };
    }
    if (fileUpload) {
      policy.fileUpload = { ...policy.fileUpload, ...fileUpload };
    }
    if (restrictions) {
      policy.restrictions = { ...policy.restrictions, ...restrictions };
    }
    if (moderation) {
      policy.moderation = { ...policy.moderation, ...moderation };
    }
    if (audit) {
      policy.audit = { ...policy.audit, ...audit };
    }

    policy.updatedBy = req.user.id;
    await policy.save();

    // Audit log
    await AuditLog.create({
      userId: req.user.id,
      userName: req.user.name,
      action: 'CHAT_POLICY_UPDATE',
      details: 'Updated chat policy',
      ip: getClientIP(req),
      device: parseDeviceFromUserAgent(req.headers['user-agent']),
      status: 'SUCCESS',
      riskLevel: 'HIGH'
    });

    res.json(policy);
  } catch (err) {
    next(err);
  }
};

// Delete room (soft delete)
export const deleteRoom = async (req, res, next) => {
  try {
    const { id } = req.params;

    const room = await ChatRoom.findById(id);
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    room.isDeleted = true;
    room.deletedAt = new Date();
    await room.save();

    // Audit log
    await AuditLog.create({
      userId: req.user.id,
      userName: req.user.name,
      action: 'CHAT_ROOM_DELETE',
      details: `Deleted chat room: ${room.name}`,
      ip: getClientIP(req),
      device: parseDeviceFromUserAgent(req.headers['user-agent']),
      status: 'SUCCESS',
      riskLevel: 'HIGH'
    });

    res.json({ success: true, message: 'Room deleted successfully' });
  } catch (err) {
    next(err);
  }
};

// Manager delete own room (soft delete, only own rooms)
export const managerDeleteRoom = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = req.user;

    const room = await ChatRoom.findById(id);
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    // Check permission: ADMIN can delete any room, MANAGER can only delete own rooms
    if (user.role === 'MANAGER' && room.createdBy?.toString() !== user.id) {
      return res.status(403).json({ message: 'You can only delete rooms you created' });
    }

    room.isDeleted = true;
    room.deletedAt = new Date();
    await room.save();

    // Audit log
    await AuditLog.create({
      userId: user.id,
      userName: user.name,
      action: 'CHAT_ROOM_DELETE',
      details: `Deleted chat room: ${room.name}`,
      ip: req.ip,
      status: 'SUCCESS',
      riskLevel: 'HIGH'
    });

    res.json({ success: true, message: 'Room deleted successfully' });
  } catch (err) {
    next(err);
  }
};

// Generate random join code
function generateJoinCode(length = 6) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Create room with join code (Manager/Admin only)
export const createRoomWithCode = async (req, res, next) => {
  try {
    const { name, description, type = 'GROUP' } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Room name is required' });
    }

    // Generate unique join code
    let joinCode = generateJoinCode();
    let existingRoom = await ChatRoom.findOne({ joinCode });
    while (existingRoom) {
      joinCode = generateJoinCode();
      existingRoom = await ChatRoom.findOne({ joinCode });
    }

    const room = await ChatRoom.create({
      name,
      description: description || '',
      type,
      isPrivate: true,
      isSystemRoom: false,
      createdBy: req.user.id,
      departmentId: req.user.departmentId || null,
      members: [{
        userId: req.user.id,
        role: 'OWNER',
        joinedAt: new Date()
      }],
      memberCount: 1,
      joinCode,
      joinCodeExpiresAt: null // No expiration by default
    });

    // Audit log
    await AuditLog.create({
      userId: req.user.id,
      userName: req.user.name,
      action: 'CHAT_ROOM_CREATE_CODE',
      details: `Created chat room with join code: ${room.name}`,
      ip: req.ip,
      status: 'SUCCESS',
      riskLevel: 'MEDIUM'
    });

    res.status(201).json({
      success: true,
      room: toClientRoom(room, true),
      joinCode: room.joinCode
    });
  } catch (err) {
    next(err);
  }
};

// Join room by code (Staff)
export const joinRoomByCode = async (req, res, next) => {
  try {
    const { joinCode } = req.body;

    if (!joinCode) {
      return res.status(400).json({ message: 'Join code is required' });
    }

    const room = await ChatRoom.findOne({
      joinCode: joinCode.toUpperCase(),
      isDeleted: { $ne: true },
      isLocked: { $ne: true }
    });

    if (!room) {
      return res.status(404).json({ message: 'Invalid or expired join code' });
    }

    // Check if user is already a member
    const isMember = room.members.some(m =>
      m.userId.toString() === req.user.id && !m.leftAt
    );

    if (isMember) {
      return res.status(400).json({ message: 'You are already a member of this room' });
    }

    // Add user as member
    room.members.push({
      userId: req.user.id,
      role: 'MEMBER',
      joinedAt: new Date()
    });
    room.memberCount = (room.memberCount || 0) + 1;
    room.lastActivityAt = new Date();
    await room.save();

    // Audit log
    await AuditLog.create({
      userId: req.user.id,
      userName: req.user.name,
      action: 'CHAT_ROOM_JOIN_CODE',
      details: `Joined room via code: ${room.name}`,
      ip: req.ip,
      status: 'SUCCESS',
      riskLevel: 'LOW'
    });

    res.json({
      success: true,
      room: toClientRoom(room)
    });
  } catch (err) {
    next(err);
  }
};

// Regenerate join code (Manager/Admin - room owner)
export const regenerateJoinCode = async (req, res, next) => {
  try {
    const { id } = req.params;

    const room = await ChatRoom.findById(id);
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    // Check if user is owner or admin
    const isOwner = room.members.some(m =>
      m.userId.toString() === req.user.id && m.role === 'OWNER'
    );
    const isAdmin = req.user.role === 'ADMIN';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: 'Only room owner can regenerate join code' });
    }

    // Generate new code
    let newJoinCode = generateJoinCode();
    let existingRoom = await ChatRoom.findOne({ joinCode: newJoinCode });
    while (existingRoom) {
      newJoinCode = generateJoinCode();
      existingRoom = await ChatRoom.findOne({ joinCode: newJoinCode });
    }

    room.joinCode = newJoinCode;
    room.joinCodeExpiresAt = null;
    await room.save();

    // Audit log
    await AuditLog.create({
      userId: req.user.id,
      userName: req.user.name,
      action: 'CHAT_ROOM_REGEN_CODE',
      details: `Regenerated join code for room: ${room.name}`,
      ip: req.ip,
      status: 'SUCCESS',
      riskLevel: 'MEDIUM'
    });

    res.json({
      success: true,
      joinCode: room.joinCode
    });
  } catch (err) {
    next(err);
  }
};

// Get chat messages between admin and specific user
export const getAdminChatMessages = async (req, res, next) => {
  try {
    const mongoose = await import('mongoose');
    const { userId } = req.params;
    const adminUserId = new mongoose.default.Types.ObjectId(req.user.id);
    const targetUserId = new mongoose.default.Types.ObjectId(userId);

    // Find the DM conversation between admin and user
    const conversation = await ChatRoom.findOne({
      isDirectMessage: true,
      participants: { $all: [adminUserId, targetUserId] },
      isDeleted: { $ne: true }
    }).lean();

    let messages = [];
    if (conversation) {
      messages = await Message.find({
        room: conversation._id.toString(),
        isDeleted: { $ne: true }
      })
      .sort({ createdAt: 1 })
      .lean();
    }

    // Also get any legacy admin room messages
    const legacyMessages = await Message.find({
      $or: [
        { room: `admin-${adminUserId}-${userId}` },
        { room: `user-${adminUserId}-${userId}` }
      ],
      isDeleted: { $ne: true }
    })
    .sort({ createdAt: 1 })
    .lean();

    // Merge and dedupe
    const allMessages = [...messages, ...legacyMessages];
    const seen = new Set();
    const uniqueMessages = allMessages.filter(m => {
      const key = m._id.toString();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    res.json({ messages: uniqueMessages.map(toClientMessage), conversationId: conversation?._id?.toString() });
  } catch (err) {
    next(err);
  }
};

// Delete admin chat message
export const deleteAdminChatMessage = async (req, res, next) => {
  try {
    const mongoose = await import('mongoose');
    const { messageId } = req.params;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    // Soft delete
    message.isDeleted = true;
    message.isHidden = true;
    message.deletedAt = new Date();
    message.deletedBy = req.user.id;
    message.deletionReason = 'Admin deleted from chat';
    await message.save();

    // Emit via socket
    const io = req.app.get('io');
    if (io && message.room) {
      io.to(message.room.toString()).emit('message_deleted', {
        messageId: message._id.toString()
      });
    }

    res.json({ success: true, message: 'Message deleted successfully' });
  } catch (err) {
    next(err);
  }
};

// Send chat message to specific user
export const sendAdminChatMessage = async (req, res, next) => {
  try {
    const mongoose = await import('mongoose');
    const { userId } = req.params;
    const { text } = req.body;
    const adminUserId = new mongoose.default.Types.ObjectId(req.user.id);
    const targetUserId = new mongoose.default.Types.ObjectId(userId);

    if (!text?.trim()) {
      return res.status(400).json({ message: 'Tin nhan khong duoc de trong' });
    }

    // Find or create DM conversation between admin and user
    let conversation = await ChatRoom.findOne({
      isDirectMessage: true,
      participants: { $all: [adminUserId, targetUserId] },
      isDeleted: { $ne: true }
    });

    const otherUser = await User.findById(userId).lean();
    const adminUser = await User.findById(req.user.id).lean();

    if (!conversation) {
      conversation = await ChatRoom.create({
        name: `DM-${req.user.id}-${userId}`,
        description: `Chat rieng voi ${otherUser?.name || 'Unknown'}`,
        type: 'PRIVATE',
        isPrivate: true,
        isDirectMessage: true,
        participants: [adminUserId, targetUserId],
        participantNames: [adminUser?.name || 'Unknown', otherUser?.name || 'Unknown'],
        relatedUserId: targetUserId,
        members: [
          { userId: adminUserId, role: 'MEMBER' },
          { userId: targetUserId, role: 'MEMBER' }
        ],
        memberCount: 2
      });
    }

    const message = await Message.create({
      userId: adminUserId,
      userName: req.user.name,
      text: text.trim(),
      room: conversation._id.toString(),
      roomId: conversation._id.toString(),
      attachments: [],
      isSystemMessage: false
    });

    // Update conversation activity
    await ChatRoom.findByIdAndUpdate(conversation._id, {
      lastMessageAt: new Date(),
      $inc: { messageCount: 1 }
    });

    // Emit via socket if available
    const io = req.app.get('io');
    if (io) {
      io.to(conversation._id.toString()).emit('receive_message', {
        id: message._id.toString(),
        userId: req.user.id,
        userName: req.user.name,
        userAvatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(req.user.name || 'default')}`,
        text: text.trim(),
        room: conversation._id.toString(),
        timestamp: message.createdAt ? new Date(message.createdAt).toISOString() : new Date().toISOString(),
        reactions: [],
        isEdited: false,
        parentMessageId: null,
        replyCount: 0,
        isRead: true,
        readCount: 1,
        attachments: [],
        hasAttachments: false,
        mentions: []
      });

      // Also emit to the other user's personal room for notifications
      io.to(`user_${userId}`).emit('new_admin_message', {
        conversationId: conversation._id.toString(),
        fromUserId: req.user.id,
        fromUserName: req.user.name,
        fromUserRole: req.user.role,
        messageId: message._id.toString()
      });

      // Emit new_admin_message_notification so notification badge shows on all pages
      console.log('[sendAdminChatMessage] Emitting to user_', userId, 'role:', req.user.role);
      io.to(`user_${userId}`).emit('new_admin_message_notification', {
        fromUserId: req.user.id,
        fromUserName: req.user.name,
        fromUserRole: req.user.role,
        messageId: message._id.toString(),
        conversationId: conversation._id.toString(),
        preview: text.trim().substring(0, 50)
      });
    }

    res.status(201).json(toClientMessage(message));
  } catch (err) {
    next(err);
  }
};
