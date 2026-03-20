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
  parentMessageId?: string | null;
  replyCount?: number;
  isRead?: boolean;
  readCount?: number;
  attachments?: ChatAttachment[];
  hasAttachments?: boolean;
  mentions?: string[];
  highlightedText?: string;
}

export interface ChatRoom {
  id: string;
  name: string;
  description?: string;
  type: string;
  isPinned?: boolean;
  unread: number;
  departmentId?: string;
  isMember?: boolean;
  isPrivate?: boolean;
  hasJoinCode?: boolean;
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

  // Use refs to avoid stale closures
  const activeRoomRef = useRef<string>('');
  const socketRef = useRef<Socket | null>(null);
  const userRef = useRef(user);
  const messageIdsRef = useRef<Set<string>>(new Set());

  // Keep refs in sync
  useEffect(() => {
    activeRoomRef.current = activeRoom;
  }, [activeRoom]);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  // Fetch messages from REST API (for persistence on load)
  const fetchMessages = useCallback(async (roomId: string) => {
    try {
      const res = await fetch(`/api/messages?room=${roomId}`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        const msgs: ChatMessage[] = Array.isArray(data) ? data : (data.messages || []);

        setMessages(prev => {
          // Merge: keep socket messages, add REST messages that aren't already present
          const existingIds = new Set(prev.map(m => m.id));
          const newMsgs = msgs.filter(m => !existingIds.has(m.id));
          return [...prev, ...newMsgs].sort((a, b) =>
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          );
        });

        // Track message IDs to avoid duplicates
        msgs.forEach(m => messageIdsRef.current.add(m.id));
      }
    } catch (err) {
      console.error('Failed to fetch messages', err);
    }
  }, []);

  // Connect socket
  useEffect(() => {
    if (!user) return;

    const newSocket = io(SOCKET_URL, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      auth: { userId: user.id, userName: user.name },
      query: { userId: user.id, userName: user.name }
    });

    socketRef.current = newSocket;

    newSocket.on('connect', () => {
      setIsConnected(true);
      // Rejoin room after reconnect
      if (activeRoomRef.current) {
        newSocket.emit('join_room', activeRoomRef.current);
      }
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
    });

    // Receive message - only add if for current room and not duplicate
    newSocket.on('receive_message', (message: ChatMessage) => {
      // Only add if message is for the current room or no room filter
      if (message.room !== activeRoomRef.current) return;

      // Deduplicate
      if (messageIdsRef.current.has(message.id)) return;
      messageIdsRef.current.add(message.id);

      setMessages(prev => {
        if (prev.find(m => m.id === message.id)) return prev;
        return [...prev, message].sort((a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
      });
    });

    // Reaction updated
    newSocket.on('reaction_updated', ({ messageId, reactions }) => {
      setMessages(prev =>
        prev.map(m => (m.id === messageId ? { ...m, reactions } : m))
      );
    });

    // Message read
    newSocket.on('message_read', ({ messageId, readCount }) => {
      setMessages(prev =>
        prev.map(m => (m.id === messageId ? { ...m, readCount } : m))
      );
    });

    // Typing indicator
    newSocket.on('user_typing', ({ room, userId, userName, isTyping }) => {
      setTypingUsers(prev => {
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
      console.log(`${mentionedBy} mentioned you in a message`);
    });

    // Message deleted (recall)
    newSocket.on('message_deleted', ({ messageId }) => {
      setMessages(prev => prev.filter(m => m.id !== messageId));
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, [user]);

  // Join room - fetch messages and join socket room
  const joinRoom = useCallback((roomId: string) => {
    if (!roomId) return;

    // Leave previous room
    if (socketRef.current && isConnected && activeRoomRef.current) {
      socketRef.current.emit('leave_room', activeRoomRef.current);
    }

    setActiveRoom(roomId);
    activeRoomRef.current = roomId;

    // Clear messages for new room
    setMessages([]);
    messageIdsRef.current.clear();

    // Join socket room
    if (socketRef.current && isConnected) {
      socketRef.current.emit('join_room', roomId);
    }

    // Fetch messages from REST API
    fetchMessages(roomId);
  }, [isConnected, fetchMessages]);

  const sendMessage = useCallback((text: string, roomId: string, parentMessageId?: string, attachments?: ChatAttachment[]) => {
    const currentUser = userRef.current;
    if (!currentUser) return;

    if (socketRef.current && isConnected) {
      socketRef.current.emit('send_message', {
        userId: currentUser.id,
        userName: currentUser.name,
        text,
        room: roomId,
        parentMessageId,
        attachments
      });
    } else {
      // Fallback: send via REST API
      fetch(`/api/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ text, room: roomId, parentMessageId })
      }).then(async res => {
        if (res.ok) {
          const data = await res.json();
          if (data.message) {
            setMessages(prev => {
              if (prev.find(m => m.id === data.message.id)) return prev;
              return [...prev, data.message];
            });
          }
        }
      }).catch(err => console.error('Failed to send message', err));
    }
  }, [isConnected]);

  // Typing indicator
  const startTyping = useCallback((roomId: string) => {
    const currentUser = userRef.current;
    if (socketRef.current && isConnected && currentUser) {
      socketRef.current.emit('typing_start', { room: roomId, userId: currentUser.id, userName: currentUser.name });
    }
  }, [isConnected]);

  const stopTyping = useCallback((roomId: string) => {
    const currentUser = userRef.current;
    if (socketRef.current && isConnected && currentUser) {
      socketRef.current.emit('typing_stop', { room: roomId, userId: currentUser.id, userName: currentUser.name });
    }
  }, [isConnected]);

  // Reactions
  const addReaction = useCallback((messageId: string, emoji: string, roomId: string) => {
    const currentUser = userRef.current;
    if (socketRef.current && isConnected && currentUser) {
      socketRef.current.emit('add_reaction', { messageId, emoji, userId: currentUser.id, userName: currentUser.name, room: roomId });
    } else {
      // Fallback: REST API
      fetch(`/api/messages/${messageId}/reactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ emoji })
      }).then(async res => {
        if (res.ok) {
          const data = await res.json();
          setMessages(prev =>
            prev.map(m => (m.id === messageId ? { ...m, reactions: data.reactions } : m))
          );
        }
      }).catch(err => console.error('Failed to add reaction', err));
    }
  }, [isConnected]);

  // Mark as read
  const markAsRead = useCallback((messageId: string, roomId: string) => {
    const currentUser = userRef.current;
    if (socketRef.current && isConnected && currentUser) {
      socketRef.current.emit('mark_read', { messageId, userId: currentUser.id, room: roomId });
    }
  }, [isConnected]);

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
  const createConversation = useCallback(async (targetUserId: string) => {
    try {
      const res = await fetch('/api/messaging/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ userId: targetUserId })
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
        return data.messages || [];
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
