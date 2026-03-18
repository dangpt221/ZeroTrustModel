import { useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';

export interface ChatAttachment {
  url: string;
  fileName: string;
  fileType: string;
  fileSize: number;
}

export interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  text: string;
  timestamp: string;
  room: string;
  reactions?: { emoji: string; userId: string; createdAt: string }[];
  isEdited?: boolean;
  editedAt?: string;
  // Threading
  parentMessageId?: string | null;
  replyCount?: number;
  // Read receipts
  isRead?: boolean;
  readCount?: number;
  // Attachments
  attachments?: ChatAttachment[];
  hasAttachments?: boolean;
  // Mentions
  mentions?: string[];
}

export interface ChatRoom {
  id: string;
  name: string;
  description?: string;
  type: string;
  isPinned?: boolean;
  unread: number;
  departmentId?: string;
}

export interface Conversation {
  id: string;
  type: 'direct';
  name: string;
  avatar: string;
  lastMessage?: {
    id: string;
    text: string;
    timestamp: string;
    userId: string;
  };
  unreadCount: number;
  userId: string;
}

const SOCKET_URL = '';

export function useChat() {
  const { user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [activeRoom, setActiveRoom] = useState<string>('');
  const [typingUsers, setTypingUsers] = useState<Map<string, { userId: string; userName: string }[]>>(new Map());
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const activeRoomRef = useRef(activeRoom);
  const pendingRoomRef = useRef<string | null>(null);

  useEffect(() => {
    activeRoomRef.current = activeRoom;
  }, [activeRoom]);

  // Connect socket
  useEffect(() => {
    if (!user) return;

    const newSocket = io(SOCKET_URL, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      auth: { userId: user.id, userName: user.name },
      query: { userId: user.id, userName: user.name }
    });

    newSocket.on('connect', () => {
      setIsConnected(true);
      newSocket.emit('join_user_room', user.id);
      if (pendingRoomRef.current) {
        newSocket.emit('join_room', pendingRoomRef.current);
        setActiveRoom(pendingRoomRef.current);
        pendingRoomRef.current = null;
      }
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
    });

    // Receive message
    newSocket.on('receive_message', (message: ChatMessage) => {
      setMessages((prev) => {
        if (prev.find((m) => m.id === message.id)) return prev;
        return [...prev, message];
      });
    });

    // Reaction updated
    newSocket.on('reaction_updated', ({ messageId, reactions }) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, reactions } : m))
      );
    });

    // Message read
    newSocket.on('message_read', ({ messageId, readCount }) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, readCount } : m))
      );
    });

    // Typing indicator
    newSocket.on('user_typing', ({ room, userId, userName, isTyping }) => {
      setTypingUsers((prev) => {
        const newMap = new Map(prev);
        const roomTyping = newMap.get(room) || [];

        if (isTyping) {
          if (!roomTyping.find(u => u.userId === userId)) {
            newMap.set(room, [...roomTyping, { userId, userName }]);
          }
        } else {
          newMap.set(room, roomTyping.filter(u => u.userId !== userId));
        }

        return newMap;
      });
    });

    // Mentioned notification
    newSocket.on('mentioned', ({ message, mentionedBy }) => {
      // Could show a notification here
      console.log(`${mentionedBy} mentioned you in a message`);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, [user]);

  const joinRoom = useCallback((roomId: string) => {
    if (!roomId) return;
    setActiveRoom(roomId);
    if (socket && isConnected) {
      socket.emit('join_room', roomId);
    } else {
      pendingRoomRef.current = roomId;
    }
  }, [socket, isConnected]);

  const sendMessage = useCallback((text: string, roomId: string, parentMessageId?: string, attachments?: ChatAttachment[]) => {
    if (socket && isConnected && user) {
      socket.emit('send_message', {
        userId: user.id,
        userName: user.name,
        text,
        room: roomId,
        parentMessageId,
        attachments
      });
    }
  }, [socket, isConnected, user]);

  // Typing indicator
  const startTyping = useCallback((roomId: string) => {
    if (socket && isConnected && user) {
      socket.emit('typing_start', { room: roomId, userId: user.id, userName: user.name });
    }
  }, [socket, isConnected, user]);

  const stopTyping = useCallback((roomId: string) => {
    if (socket && isConnected && user) {
      socket.emit('typing_stop', { room: roomId, userId: user.id, userName: user.name });
    }
  }, [socket, isConnected, user]);

  // Reactions
  const addReaction = useCallback((messageId: string, emoji: string, roomId: string) => {
    if (socket && isConnected && user) {
      socket.emit('add_reaction', { messageId, emoji, userId: user.id, userName: user.name, room: roomId });
    }
  }, [socket, isConnected, user]);

  // Mark as read
  const markAsRead = useCallback((messageId: string, roomId: string) => {
    if (socket && isConnected && user) {
      socket.emit('mark_read', { messageId, userId: user.id, room: roomId });
    }
  }, [socket, isConnected, user]);

  // Fetch conversations (DMs)
  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch('/api/messaging/conversations', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setConversations(data.conversations || []);
      }
    } catch (err) {
      console.error('Failed to fetch conversations', err);
    }
  }, []);

  // Create new DM
  const createConversation = useCallback(async (userId: string) => {
    try {
      const res = await fetch('/api/messaging/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ userId })
      });
      if (res.ok) {
        const data = await res.json();
        await fetchConversations();
        return data;
      }
    } catch (err) {
      console.error('Failed to create conversation', err);
    }
  }, [fetchConversations]);

  // Search messages
  const searchMessages = useCallback(async (query: string, roomId?: string) => {
    try {
      const params = new URLSearchParams({ q: query });
      if (roomId) params.append('room', roomId);
      const res = await fetch(`/api/messages/search?${params}`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        return data.messages;
      }
    } catch (err) {
      console.error('Failed to search messages', err);
    }
    return [];
  }, []);

  // Get thread replies
  const getReplies = useCallback(async (messageId: string) => {
    try {
      const res = await fetch(`/api/messages/${messageId}/replies`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        return data;
      }
    } catch (err) {
      console.error('Failed to get replies', err);
    }
    return [];
  }, []);

  return {
    socket,
    isConnected,
    messages,
    setMessages,
    activeRoom,
    joinRoom,
    sendMessage,
    typingUsers,
    startTyping,
    stopTyping,
    addReaction,
    markAsRead,
    conversations,
    fetchConversations,
    createConversation,
    searchMessages,
    getReplies
  };
}
