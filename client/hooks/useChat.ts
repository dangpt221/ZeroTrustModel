import { useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';
import { notificationsApi, e2eeApi } from '../api';
import { useE2EE } from '../context/E2EEContext';
import { encryptMessage, decryptMessage, importPublicKey, importPrivateKey, deriveActiveAesKey, generateEphemeralRatchet, processEphemeralRatchet, signMessage, verifySignature } from '../utils/e2ee';

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
  parentMessageText?: string | null;
  parentMessageUserName?: string | null;
  replyCount?: number;
  isRead?: boolean;
  readCount?: number;
  attachments?: ChatAttachment[];
  hasAttachments?: boolean;
  mentions?: string[];
  highlightedText?: string;
  senderSignPubKey?: string; // [PRO LEVEL]
  decryptedContent?: string; // Client side ONLY
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
  isDirectMessage?: boolean;
  participants?: any[];
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

export function useChat() {
  const { user } = useAuth();
  const { isE2EEReady, deviceId, getDevicePrivateKey, publicKeyStr } = useE2EE();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [activeRoom, setActiveRoom] = useState<string>('');
  const [typingUsers, setTypingUsers] = useState<Map<string, { userId: string; userName: string }[]>>(new Map());
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());

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

    // Decrypt function
    const processIncomingMessage = useCallback(async (msg: any): Promise<ChatMessage> => {
      // Access the latest context via refs if needed, but since we are inside useCallback, we can use the E2EE hook variables if they are fresh.
      // Better to check localStorage directly if hook is stale, but let's assume they are injected.
      const currentDeviceId = localStorage.getItem(`e2ee_device_id_${userRef.current?.id}`);
      
      if (!currentDeviceId) return { ...msg, text: '[Lỗi Debug: Thiết bị chưa đăng ký trên trình duyệt này]' };
      if (!msg.encryptedContent) return { ...msg, text: '[Lỗi Debug: Database không trả về encryptedContent]' };
      if (!Array.isArray(msg.encryptedContent)) return { ...msg, text: '[Lỗi Debug: encryptedContent bị lỗi định dạng mảng]' };

      if (msg.encryptedContent && Array.isArray(msg.encryptedContent) && currentDeviceId) {
         const myEnc = msg.encryptedContent.find((e: any) => e.deviceId === currentDeviceId);
         if (myEnc) {
            try {
              // We need private key
               const storedPrivKey = localStorage.getItem(`e2ee_private_key_jwk_${userRef.current?.id}`);
               if (storedPrivKey) {
                  const privKey = await importPrivateKey(JSON.parse(storedPrivKey), "ECDH", true);
                  
                  // [PRO LEVEL] Double Ratchet - Derived from ephemeral
                  const aesKey = await processEphemeralRatchet(privKey, myEnc.senderPublicKey);
                  
                  // [PRO LEVEL] ECDSA Verification
                  if (myEnc.signature && msg.senderSignPubKey) {
                    const senderSignPubKey = await importPublicKey(msg.senderSignPubKey, "ECDSA");
                    const isValid = await verifySignature(senderSignPubKey, myEnc.signature, myEnc.ciphertext);
                    if (!isValid) return { ...msg, text: '⚠️ [Cảnh báo an ninh] Chữ ký số không hợp lệ! Tin nhắn giả mạo.' };
                  }

                  const decryptedText = await decryptMessage(aesKey, myEnc.ciphertext, myEnc.iv);
                  return { ...msg, text: decryptedText };
               } else {
                 return { ...msg, text: '[Lỗi Debug: Mất Private Key trong LocalStorage]' };
              }
            } catch (err: any) {
              console.warn('Decryption failed for msg', msg.id, err);
              return { ...msg, text: `[Lỗi giải mã: ${err.message || err.toString()}]` };
            }
         } else {
            return { ...msg, text: '[Tin nhắn E2EE không có khóa cho thiết bị này]' };
         }
      }
      return { ...msg, text: '[Lỗi Debug: Unknown Fallback]' };
    }, []);

  const [isLoadingMessages, setIsLoadingMessages] = useState(false);

  // Fetch messages from REST API (for persistence on load)
  const fetchMessages = useCallback(async (roomId: string) => {
    setIsLoadingMessages(true);
    try {
      const res = await fetch(`/api/messages?room=${roomId}`, { credentials: 'include' });
      if (res.status === 403) {
          const data = await res.json();
          alert(data.error || 'Bạn cần nhập mã bảo mật để tham gia');
          setMessages([]);
          setIsLoadingMessages(false);
          return;
      }
      if (res.ok) {
        const data = await res.json();
        const msgs: any[] = Array.isArray(data) ? data : (data.messages || []);

        // Decrypt all messages
        const processedMsgs = await Promise.all(msgs.map(m => processIncomingMessage(m)));

        setMessages(prev => {
          // Merge: keep socket messages, add REST messages that aren't already present
          const existingIds = new Set(prev.map(m => m.id));
          const newMsgs = processedMsgs.filter(m => !existingIds.has(m.id));
          return [...prev, ...newMsgs].sort((a, b) =>
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          );
        });

        // Track message IDs to avoid duplicates
        processedMsgs.forEach(m => {
           messageIdsRef.current.add(m.id);
           if (!m.isRead && m.userId !== userRef.current?.id) {
              markAsRead(m.id, roomId);
           }
        });
      }
    } catch (err) {
      console.error('Failed to fetch messages', err);
      setMessages([]);
    } finally {
      setIsLoadingMessages(false);
    }
  }, [userRef]);

  // Connect socket
  useEffect(() => {
    if (!user) return;

    const newSocket = io(window.location.origin, {
      transports: ['websocket'],
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
      setOnlineUsers(new Set()); // Reset online users on disconnect
    });

    // Handle online presence
    newSocket.on('initial_online_users', (userIds: string[]) => {
      setOnlineUsers(new Set(userIds));
    });

    newSocket.on('user_status_changed', ({ userId, isOnline }) => {
      setOnlineUsers(prev => {
        const next = new Set(prev);
        if (isOnline) {
          next.add(userId);
        } else {
          next.delete(userId);
        }
        return next;
      });
    });

    // Receive message - only add if for current room and not duplicate
    newSocket.on('receive_message', async (message: any) => {
      // Only add if message is for the current room or no room filter
      if (message.room !== activeRoomRef.current) return;

      // Deduplicate
      if (messageIdsRef.current.has(message.id)) return;
      messageIdsRef.current.add(message.id);

      const processedMsg = await processIncomingMessage(message);

      setMessages(prev => {
        if (prev.find(m => m.id === processedMsg.id)) return prev;
        return [...prev, processedMsg].sort((a, b) =>
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
    newSocket.on('mentioned', ({ room, messageId, byUserName }) => {
      // Could show toast notification here
      console.log(`Mentioned in room ${room} by ${byUserName}`);
    });

    // Room deleted notification
    newSocket.on('room_deleted', (deletedRoomId: string) => {
      if (activeRoomRef.current === deletedRoomId) {
        setMessages([]);
        setActiveRoom(null);
        alert('Hộp thoại hiện tại đã bị xóa.');
      }
      fetchConversations();
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

  const sendMessage = useCallback(async (text: string, roomId: string, parentMessageId?: string, attachments?: ChatAttachment[]) => {
    const currentUser = userRef.current;
    if (!currentUser) return;

    let encryptedContent = null;
    let fallbackText = text;

    const currentDeviceId = localStorage.getItem(`e2ee_device_id_${currentUser.id}`);
    const storedPrivKey = localStorage.getItem(`e2ee_private_key_jwk_${currentUser.id}`);
    const currentPubKeyStr = localStorage.getItem(`e2ee_public_key_b64_${currentUser.id}`);
    const currentSignPrivKey = localStorage.getItem(`e2ee_sign_private_key_jwk_${currentUser.id}`);
    const currentSignPubKey = localStorage.getItem(`e2ee_sign_public_key_b64_${currentUser.id}`);

    if (currentDeviceId && storedPrivKey && currentPubKeyStr && currentSignPrivKey) {
      try {
        // Fetch room members
        const res = await fetch(`/api/messaging/rooms/${roomId}/members`, { credentials: 'include' });
        if (res.ok) {
           const data = await res.json();
           const memberIds = data.members.map((m: any) => m.id);
           if (!memberIds.includes(currentUser.id)) memberIds.push(currentUser.id);

           // Fetch public keys
           const keysRes = await e2eeApi.getPublicKeys(memberIds);
           const publicKeys = keysRes.keys;

           // Encrypt
           const signPriv = await importPrivateKey(JSON.parse(currentSignPrivKey), "ECDSA", true);

           if (publicKeys) {
             encryptedContent = [];
             for (const uid in publicKeys) {
               for (const device of publicKeys[uid]) {
                  try {
                    const theirPub = await importPublicKey(device.publicKey, "ECDH");
                    
                    // [PRO LEVEL] Generate Ephemeral Key for this message
                    const { sharedSecret, ephemeralPubKeyB64 } = await generateEphemeralRatchet(theirPub);
                    const { ciphertext, iv } = await encryptMessage(sharedSecret, text);
                    
                    // [PRO LEVEL] Sign Ciphertext
                    const signature = await signMessage(signPriv, ciphertext);

                    encryptedContent.push({
                       deviceId: device.deviceId,
                       ciphertext, 
                       iv, 
                       senderPublicKey: ephemeralPubKeyB64,
                       signature
                    });
                  } catch (e) { console.warn('Could not encrypt for device', device.deviceId); }
               }
             }
             fallbackText = "[Tin nhắn được bảo mật mã hóa đầu cuối / Đã thay chìa khóa Ephemeral]";
           }
        }
      } catch (err) {
        console.error('E2EE Encryption flow failed', err);
      }
    }

    if (socketRef.current && isConnected) {
      socketRef.current.emit('send_message', {
        userId: currentUser.id,
        userName: currentUser.name,
        userRole: currentUser.role,
        text: fallbackText,
        encryptedContent,
        senderDeviceId: currentDeviceId,
        room: roomId,
        parentMessageId,
        attachments,
        senderSignPubKey: localStorage.getItem(`e2ee_sign_public_key_b64_${currentUser.id}`) // Kèm key xác minh chữ ký
      });
      // Create chat notification for admin if sender is MANAGER or STAFF
      if (currentUser.role === 'MANAGER' || currentUser.role === 'STAFF') {
        notificationsApi.createChatNotification?.({
          roomId,
          messagePreview: text.substring(0, 50)
        }).catch((err: any) => console.error('Failed to create chat notification:', err));
      }
    } else {
      // Fallback: send via REST API (only when socket is disconnected)
      fetch(`/api/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ text: fallbackText, encryptedContent, senderDeviceId: currentDeviceId, room: roomId, parentMessageId, senderSignPubKey: localStorage.getItem(`e2ee_sign_public_key_b64_${currentUser.id}`) })
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

  // Mark a single message as read
  const markAsRead = useCallback((messageId: string, roomId: string) => {
    const currentUser = userRef.current;
    if (socketRef.current && isConnected && currentUser) {
      socketRef.current.emit('mark_read', { messageId, userId: currentUser.id, room: roomId });
    }
  }, [isConnected]);

  // Mark ALL messages in a room as read
  const markRoomAsRead = useCallback(async (roomId: string) => {
    const currentUser = userRef.current;
    if (!roomId || !currentUser) return;

    try {
      // Backend update
      const res = await fetch(`/api/messages/room/${roomId}/read-all`, {
        method: 'POST',
        credentials: 'include'
      });

      if (res.ok) {
        // Socket update if needed (backend also emits all_messages_read)
        if (socketRef.current && isConnected) {
          socketRef.current.emit('mark_room_read', { roomId, userId: currentUser.id });
        }

        // Optimistic UI update: clear unreadCount for this conversation in state
        setConversations(prev => prev.map(c => 
          c.id === roomId ? { ...c, unreadCount: 0 } : c
        ));
      }
    } catch (err) {
      console.error('[useChat] Failed to mark room as read:', err);
    }
  }, [isConnected]);

  // Fetch conversations (DMs)
  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch('/api/messaging/conversations', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        const convs = data.conversations || [];
        // Deduplicate by userId - keep the most recent one
        const seen = new Map();
        for (const c of convs) {
          if (!seen.has(c.userId)) {
            // Decrypt lastMessage
            if (c.lastMessage && c.lastMessage.encryptedContent) {
               try {
                 const decryptedMs = await processIncomingMessage(c.lastMessage);
                 c.lastMessage.text = decryptedMs.text;
               } catch(e) {}
            }
            seen.set(c.userId, c);
          }
        }
        setConversations(Array.from(seen.values()));
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
    isLoadingMessages,
    activeRoom,
    joinRoom,
    sendMessage,
    typingUsers,
    startTyping,
    stopTyping,
    addReaction,
    markAsRead,
    markRoomAsRead,
    conversations,
    fetchConversations,
    createConversation,
    searchMessages,
    getReplies,
    processIncomingMessage,
    onlineUsers
  };
}
