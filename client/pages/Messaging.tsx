import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft, ChevronRight, Hash, Lock, MessageCircle, MessageSquare,
  MoreVertical, Pin, Plus, Search, Send, Shield, Smile,
  Trash2, Users, Wifi, WifiOff, X
} from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useE2EE } from '../context/E2EEContext';
import { ChatMessage, ChatRoom, useChat } from '../hooks/useChat';
import { DeviceManagementModal } from '../components/DeviceManagementModal';

const formatTime = (timestamp: string) => {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const hours = Math.floor(diff / 3600000);
  const minutes = Math.floor(diff / 60000);

  if (minutes < 60) return `${minutes} phút trước`;
  if (hours < 24) return `${hours} giờ trước`;
  return date.toLocaleDateString('vi-VN', { day: 'numeric', month: 'numeric' });
};

const COMMON_EMOJIS = ['👍', '❤️', '😮', '😢', '😠', '😂'];

const STICKER_CATEGORIES = [
  { name: 'Cảm xúc', stickers: ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😋', '😛', '😜', '🤪', '😝', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '😮‍💨', '🤥', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🤧', '🥵', '🥶', '🥴', '😵', '🤯', '🤠', '🥳', '🥸', '😎', '🤓', '🧐', '😕', '😟', '🙁', '😮', '😯', '😲', '😳', '🥺', '😦', '😧', '😨', '😰', '😥', '😢', '😭', '😱', '😖', '😣', '😞', '😓', '😩', '😫', '🥱', '😤', '😡', '😠', '🤬', '😈', '👿', '💀', '☠️', '💩', '🤡', '👹', '👺', '👻', '👽', '👾', '🤖'] },
  { name: 'Hand', stickers: ['👍', '👎', '👊', '✊', '🤛', '🤜', '🤝', '👏', '🙌', '👐', '🤲', '🤞', '✌️', '🤟', '🤘', '👌', '🤌', '👈', '👉', '👆', '👇', '☝️', '✋', '🤚', '🖐', '🖖', '👋', '🤙', '💪', '🦾', '🖕', '✍️', '🙏'] },
  { name: 'Symbols', stickers: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '♥️', '♦️', '♣️', '♠️', '🃏', '🎴', '🀄', '🔴', '🟠', '🟡', '🟢', '🔵', '🟣', '⚫', '⚪', '🟤', '🔺', '🔻', '🔸', '🔹', '🔶', '🔷', '💎', '🏆', '🥇', '🥈', '🥉', '🏅', '🎖', '🎗', '🎪', '🎫', '🎟', '🎭', '🎨', '🎬', '🎤', '🎧', '🎼', '🎹', '🥁', '🎷', '🎺', '🎸', '🪕', '🎻', '🎲', '♟️', '🎯', '🎳', '🎮', '🎰'] },
  { name: 'Con vật', stickers: ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐻‍❄️', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🙈', '🙉', '🙊', '🐒', '🐔', '🐧', '🐦', '🐤', '🦆', '🦅', '🦉', '🦇', '🐺', '🐗', '🐴', '🦄', '🐝', '🐛', '🦋', '🐌', '🐞', '🐜', '🦟', '🦗', '🕷️', '🦂', '🐢', '🐍', '🦎', '🦖', '🦕', '🐙', '🦑', '🦐', '🦞', '🦀', '🐡', '🐠', '🐟', '🐬', '🐳', '🐋', '🦈', '🐊', '🐅', '🐆', '🦓', '🦍', '🦧', '🦣', '🐘', '🦛', '🦏', '🐪', '🐫', '🦒', '🦘', '🦬', '🐃', '🐂', '🐄', '🐎', '🐖', '🐏', '🐑', '🦙', '🐐', '🦌', '🐕', '🐩', '🦮', '🐈', '🐓', '🦃', '🦚', '🦜', '🦢', '🦩', '🕊️', '🐇', '🦝', '🦨', '🦡', '🦫', '🦦', '🦥', '🐁', '🐀', '🐿️', '🦔'] },
  { name: 'Food', stickers: ['🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐', '🍈', '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🍆', '🥑', '🥦', '🥬', '🥒', '🌶️', '🫑', '🌽', '🥕', '🧄', '🧅', '🥔', '🍠', '🥐', '🥯', '🍞', '🥖', '🥨', '🧀', '🥚', '🍳', '🧈', '🥞', '🧇', '🥓', '🥩', '🍗', '🍖', '🦴', '🌭', '🍔', '🍟', '🍕', '🫓', '🥪', '🥙', '🧆', '🌮', '🌯', '🫔', '🥗', '🥘', '🫕', '🍝', '🍜', '🍲', '🍛', '🍣', '🍱', '🥟', '🦪', '🍤', '🍙', '🍚', '🍘', '🍥', '🥠', '🥮', '🍢', '🍡', '🍧', '🍨', '🍦', '🥧', '🧁', '🍰', '🎂', '🍮', '🍭', '🍬', '🍫', '🍿', '🍩', '🍪', '🌰', '🥜', '🍯', '🥛', '🍼', '☕', '🫖', '🍵', '🧃', '🥤', '🧋', '🍶', '🍺', '🍻', '🥂', '🍷', '🥃', '🍸', '🍹', '🧉', '🍾', '🧊'] },
  { name: 'Đồ vật', stickers: ['⌚', '📱', '💻', '⌨️', '🖥️', '🖨️', '🖱️', '🖲️', '💽', '💾', '💿', '📀', '📼', '📷', '📸', '📹', '🎥', '📽️', '🎞️', '📞', '☎️', '📟', '📠', '📺', '📻', '🎙️', '🎚️', '🎛️', '🧭', '⏱️', '⏲️', '⏰', '🕰️', '⌛', '⏳', '📡', '🔋', '🔌', '💡', '🔦', '🕯️', '🪔', '🧯', '🛢️', '💸', '💵', '💴', '💶', '💷', '🪙', '💰', '💳', '💎', '⚖️', '🪜', '🧰', '🪛', '🔧', '🔨', '⚒️', '🛠️', '⛏️', '🪚', '🔩', '⚙️', '🪤', '🧱', '⛓️', '🧲', '🔫', '💣', '🧨', '🪓', '🔪', '🗡️', '⚔️', '🛡️', '🚬', '⚰️', '🪦', '⚱️', '🏺', '🔮', '📿', '🧿', '💈', '⚗️', '🔭', '🔬', '🕳️', '🩹', '🩺', '💊', '💉', '🩸', '🧬', '🦠', '🧫', '🧪', '🌡️', '🧹', '🪠', '🧺', '🧻', '🚽', '🚿', '🛁', '🛀', '🧼', '🪥', '🪒', '🧽', '🪣', '🧴', '🛎️', '🔑', '🗝️', '🚪', '🪑', '🛋️', '🛏️', '🛌', '🧸', '🪆', '🖼️', '🪞', '🪟', '🛒', '🎁', '🎈', '🎏', '🎀', '🪄', '🪅', '🎊', '🎉', '🎎', '🏮', '🎐', '🧧', '✉️', '📩', '📨', '📧', '💌', '📥', '📤', '📦', '🏷️', '🧳', '📪', '📫', '📬', '📭', '📮', '📯', '📜', '📃', '📄', '📑', '🧾', '📊', '📈', '📉', '🗒️', '🗓️', '📆', '📅', '🗑️', '📇', '🗃️', '🗳️', '🗄️', '📋', '📁', '📂', '🗂️', '🗞️', '📰', '📓', '📔', '📒', '📕', '📗', '📘', '📙', '📚', '📖', '🔖', '🧷', '🔗', '📎', '🖇️', '📐', '📏', '🧮', '📌', '📍', '✂️', '🖊️', '🖋️', '✒️', '🖌️', '🖍️', '📝', '✏️', '🔍', '🔎', '🔏', '🔐', '🔒', '🔓'] },
];

export const Messaging: React.FC = () => {
  const { user } = useAuth();
  const { isE2EEReady, requiresRecovery, hasDbBackup, setupRecoveryBackup, recoverFromPIN } = useE2EE();
  const {
    messages, setMessages, isLoadingMessages, activeRoom, joinRoom, sendMessage,
    isConnected, typingUsers, startTyping, stopTyping,
    addReaction, markAsRead, markRoomAsRead, conversations, fetchConversations,
    createConversation, searchMessages, getReplies, processIncomingMessage,
    onlineUsers
  } = useChat();

  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [activeTab, setActiveTab] = useState<'channels' | 'dms'>('channels');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ChatMessage[]>([]);
  const [showNewChat, setShowNewChat] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [userSearchResults, setUserSearchResults] = useState<any[]>([]);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [showThread, setShowThread] = useState(false);
  const [threadMessages, setThreadMessages] = useState<ChatMessage[]>([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null);
  const [showStickerPanel, setShowStickerPanel] = useState(false);
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const [mentionUsers, setMentionUsers] = useState<any[]>([]);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionFilter, setMentionFilter] = useState<any[]>([]);

  // Create room form
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomDesc, setNewRoomDesc] = useState('');
  const [newRoomHasCode, setNewRoomHasCode] = useState(false);
  const [newRoomCode, setNewRoomCode] = useState('');
  const [creatingRoom, setCreatingRoom] = useState(false);

  // Modal states
  const [showCreateRoomModal, setShowCreateRoomModal] = useState(false);
  const [showDeleteRoomModal, setShowDeleteRoomModal] = useState(false);
  const [pendingRoomId, setPendingRoomId] = useState('');
  const [pendingRoomName, setPendingRoomName] = useState('');

  // E2EE Modals
  const [showSetupPinModal, setShowSetupPinModal] = useState(false);
  const [showDeviceModal, setShowDeviceModal] = useState(false); // [PRO LEVEL] Device Management
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [isProcessingPin, setIsProcessingPin] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isManager = user?.role === 'MANAGER';
  const isMember = user?.role === 'STAFF';

  let themeBg = 'bg-blue-600';
  let themeHover = 'hover:bg-blue-700';
  let themeText = 'text-blue-600';
  let themeIconBg = 'bg-blue-100';
  let themeRing = 'focus:ring-blue-500/20 focus:border-blue-400';

  if (isManager) {
    themeBg = 'bg-sky-500';
    themeHover = 'hover:bg-sky-600';
    themeText = 'text-sky-600';
    themeIconBg = 'bg-sky-100';
    themeRing = 'focus:ring-sky-500/20 focus:border-sky-400';
  } else if (isMember) {
    themeBg = 'bg-emerald-500';
    themeHover = 'hover:bg-emerald-600';
    themeText = 'text-emerald-600';
    themeIconBg = 'bg-emerald-100';
    themeRing = 'focus:ring-emerald-500/20 focus:border-emerald-400';
  }

  const [inputText, setInputText] = useState('');
  const [roomSearch, setRoomSearch] = useState('');

  // Fetch Rooms on Mount
  useEffect(() => {
    const fetchData = async () => {
      setLoadingRooms(true);
      try {
        const res = await fetch('/api/messaging/rooms', { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          const pRooms = data.rooms || [];
          for (const r of pRooms) {
            if (r.lastMessage && r.lastMessage.encryptedContent) {
              try {
                const dec = await processIncomingMessage(r.lastMessage);
                r.lastMessage.text = dec.text;
              } catch (e) {}
            }
          }
          setRooms(pRooms);

          // Check if we need to open a specific DM from notification click
          const openDMWithUserId = localStorage.getItem('openDMWithUserId');
          const openDMWith = localStorage.getItem('openDMWith');
          console.log('[Messaging] Mount - openDMWithUserId:', openDMWithUserId, 'openDMWith:', openDMWith);

          if (openDMWithUserId) {
            // Direct open using userId - no search needed
            localStorage.removeItem('openDMWithUserId');
            setActiveTab('dms');
            console.log('[Messaging] Opening DM with userId:', openDMWithUserId);
            const conv = await createConversation(openDMWithUserId);
            console.log('[Messaging] createConversation result:', conv);
            if (conv) {
              joinRoom(conv.id);
            }
          } else if (openDMWith) {
            // Fallback: search by name
            localStorage.removeItem('openDMWith');
            setActiveTab('dms');
            setShowNewChat(true);
            setUserSearch(openDMWith);
          } else if (data.rooms && data.rooms.length > 0 && !activeRoom) {
            joinRoom(data.rooms[0].id);
          }
        }
        await fetchConversations();
      } catch (err) {
        console.error('Failed to fetch rooms', err);
      } finally {
        setLoadingRooms(false);
      }
    };
    fetchData();
  }, []);

  // Listen for custom SPA navigation events from ChatBadge
  useEffect(() => {
    const handleOpenChatEvent = async (e: any) => {
      const { userId } = e.detail;
      if (userId) {
        console.log('[Messaging] open_chat event received for userId:', userId);
        setActiveTab('dms');
        const conv = await createConversation(userId);
        if (conv) {
          joinRoom(conv.id);
        }
      }
    };
    window.addEventListener('open_chat', handleOpenChatEvent);
    return () => window.removeEventListener('open_chat', handleOpenChatEvent);
  }, [createConversation, joinRoom]);


  const activeRoomData = rooms.find(r => r.id === activeRoom);
  const departmentId = user?.departmentId;

  const filteredRooms = rooms.filter(r => {
    const matchesSearch = r.name.toLowerCase().includes(roomSearch.toLowerCase());
    if (isManager && departmentId) {
      return matchesSearch && (r.isPinned || r.departmentId === departmentId);
    }
    return matchesSearch;
  });

  const pinnedRooms = filteredRooms.filter(r => r.isPinned);
  const normalRooms = filteredRooms.filter(r => !r.isPinned);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Typing handler
  const handleInputChange = (text: string) => {
    setInputText(text);

    // Detect @ mention
    const lastAtIndex = text.lastIndexOf('@');
    if (lastAtIndex !== -1 && lastAtIndex === text.length - 1) {
      // User just typed @
      setShowMentionDropdown(true);
      setMentionQuery('');
      setMentionFilter(mentionUsers);
    } else if (lastAtIndex !== -1 && showMentionDropdown) {
      // User is typing after @
      const query = text.slice(lastAtIndex + 1);
      setMentionQuery(query);
      if (query.length === 0) {
        setMentionFilter(mentionUsers);
      } else {
        setMentionFilter(mentionUsers.filter(u =>
          u.name.toLowerCase().includes(query.toLowerCase())
        ));
      }
    } else {
      setShowMentionDropdown(false);
      setMentionQuery('');
    }

    if (activeRoom) {
      startTyping(activeRoom);

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      typingTimeoutRef.current = setTimeout(() => {
        stopTyping(activeRoom);
      }, 2000);
    }
  };
  // Fetch mention users when room changes
  useEffect(() => {
    if (!activeRoom) return;
    const fetchMentionUsers = async () => {
      try {
        const res = await fetch(`/api/messaging/rooms/${activeRoom}/members`, { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          setMentionUsers(data.members || []);
          setMentionFilter(data.members || []);
        }
      } catch (err) {
        console.error('Failed to fetch mention users', err);
      }
    };
    fetchMentionUsers();
  }, [activeRoom]);

  // Automatic Mark as Read when entering a room
  useEffect(() => {
    if (activeRoom) {
      console.log('[Messaging] Auto marking room as read:', activeRoom);
      markRoomAsRead(activeRoom);
    }
  }, [activeRoom, markRoomAsRead]);

  // Handle mention selection
  const handleMentionSelect = (selectedUser: any) => {
    const lastAtIndex = inputText.lastIndexOf('@');
    const beforeMention = inputText.slice(0, lastAtIndex);
    const newText = beforeMention + `@${selectedUser.name} `;
    setInputText(newText);
    setShowMentionDropdown(false);
    setMentionQuery('');
    inputRef.current?.focus();
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = inputText.trim();
    if (!text || !user || !activeRoom) return;

    if (inputRef.current) inputRef.current.value = '';
    const savedText = text;
    setInputText('');
    setReplyingTo(null);
    stopTyping(activeRoom);
    sendMessage(savedText, activeRoom, replyingTo?.id || undefined);
  };

  const handleRecall = async (msgId: string) => {
    if (!confirm('Thu hồi tin nhắn này?')) return;
    try {
      const res = await fetch(`/api/messages/${msgId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (res.ok) {
        setMessages(prev => prev.filter(m => m.id !== msgId));
      } else {
        const data = await res.json();
        alert(data.message || 'Không thể thu hồi');
      }
    } catch (err) {
      console.error('Recall failed:', err);
      alert('Không thể thu hồi tin nhắn');
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    const results = await searchMessages(searchQuery, activeRoom || undefined);
    setSearchResults(results || []);
  };

  const handleNewChat = async (targetUserId: string) => {
    const conv = await createConversation(targetUserId);
    if (conv) {
      joinRoom(conv.id);
      setShowNewChat(false);
      setUserSearch('');
      setUserSearchResults([]);
    }
  };

  const handleSearchUsers = async () => {
    if (!userSearch.trim()) {
      setUserSearchResults([]);
      return;
    }
    setLoadingSearch(true);
    try {
      const res = await fetch(`/api/messaging/users/search?q=${encodeURIComponent(userSearch)}`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        const filtered = (data.users || []).filter((u: any) => u.id !== user?.id);
        setUserSearchResults(filtered);
      }
    } catch (err) {
      console.error('Failed to search users', err);
    } finally {
      setLoadingSearch(false);
    }
  };

  useEffect(() => {
    if (!userSearch.trim()) {
      setUserSearchResults([]);
      return;
    }
    const timer = setTimeout(() => {
      handleSearchUsers();
    }, 300);
    return () => clearTimeout(timer);
  }, [userSearch]);

  // Auto-select user when search results come back from notification click
  useEffect(() => {
    const openDMWith = localStorage.getItem('openDMWith');
    if (userSearchResults.length > 0 && openDMWith) {
      const targetUser = userSearchResults.find((u: any) =>
        u.name?.toLowerCase().includes(openDMWith.toLowerCase()) ||
        u.email?.toLowerCase().includes(openDMWith.toLowerCase())
      );
      if (targetUser) {
        // Directly call createConversation and joinRoom
        createConversation(targetUser.id).then((conv: any) => {
          if (conv) {
            joinRoom(conv.id);
            setShowNewChat(false);
            setUserSearch('');
            setUserSearchResults([]);
          }
        });
      }
      localStorage.removeItem('openDMWith');
    }
  }, [userSearchResults]);

  const handleViewThread = async (message: ChatMessage) => {
    setReplyingTo(message);
    const replies = await getReplies(message.id);
    setThreadMessages(replies || []);
    setShowThread(true);
  };

  const handleReaction = (messageId: string, emoji: string) => {
    if (activeRoom) {
      addReaction(messageId, emoji, activeRoom);
      setShowEmojiPicker(null);
    }
  };

  const handleDeleteRoom = async () => {
    if (!pendingRoomId) return;
    try {
      const res = await fetch(`/api/messaging/rooms/${pendingRoomId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (res.ok) {
        setRooms(prev => prev.filter(r => r.id !== pendingRoomId));
        setShowDeleteRoomModal(false);
        setPendingRoomId('');
        setPendingRoomName('');
      } else {
        const data = await res.json();
        alert(data.message || 'Không thể xóa phòng');
      }
    } catch (err) {
      console.error('Delete room failed:', err);
      alert('Không thể xóa phòng');
    }
  };

  const handleCreateRoom = async () => {
    if (!newRoomName.trim()) {
      alert('Vui lòng nhập tên phòng');
      return;
    }
    if (newRoomHasCode && !newRoomCode.trim()) {
      alert('Vui lòng nhập mã bảo mật');
      return;
    }
    setCreatingRoom(true);
    try {
      const res = await fetch('/api/messaging/rooms', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newRoomName.trim(),
          description: newRoomDesc.trim(),
          hasSecurityCode: newRoomHasCode,
          securityCode: newRoomHasCode ? newRoomCode.trim() : null
        })
      });
      if (res.ok) {
        const data = await res.json();
        setRooms(prev => [...prev, data.room]);
        setShowCreateRoomModal(false);
        setNewRoomName('');
        setNewRoomDesc('');
        setNewRoomHasCode(false);
        setNewRoomCode('');
        joinRoom(data.room.id);
      } else {
        const data = await res.json();
        alert(data.message || 'Không thể tạo phòng');
      }
    } catch (err) {
      console.error('Create room failed:', err);
      alert('Không thể tạo phòng');
    } finally {
      setCreatingRoom(false);
    }
  };

  const roomMessages = messages.filter(m => m.room === activeRoom);
  const typingInRoom = typingUsers.get(activeRoom || '') || [];

  const getRoomIcon = (room: ChatRoom) => {
    if (room.type === 'direct' || room.type === 'DM') return MessageCircle;
    if (room.type === 'GROUP' || room.type === 'channel') return Hash;
    return Shield;
  };

  if (requiresRecovery) {
    return (
      <div className="flex-1 w-full h-full flex flex-col items-center justify-center bg-slate-50">
        <div className="bg-white p-4 md:p-8 rounded-2xl shadow-xl max-w-sm w-full text-center">
          <Shield className="w-16 h-16 text-blue-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-800 mb-2">Khôi phục Mã hóa Cuối (E2EE)</h2>
          <p className="text-sm text-slate-500 mb-6">Bạn đang đăng nhập trên thiết bị mới. Hãy nhập mã PIN 6 số mà bạn đã thiết lập để khôi phục khóa và tin nhắn bảo mật.</p>
          
          <input
            type="password"
            maxLength={6}
            value={pinInput}
            onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))}
            placeholder="PIN 6 số"
            className="w-full text-center text-3xl tracking-[0.5em] font-mono bg-slate-100 border-none rounded-xl py-4 focus:ring-2 focus:ring-blue-200 mb-2"
          />
          {pinError && <p className="text-sm text-red-500 mb-4">{pinError}</p>}
          
          <button
            disabled={pinInput.length !== 6 || isProcessingPin}
            onClick={async () => {
              setIsProcessingPin(true);
              setPinError('');
              const ok = await recoverFromPIN(pinInput);
              if (!ok) setPinError('Mã PIN không chính xác hoặc dữ liệu lỗi.');
              else setPinInput('');
              setIsProcessingPin(false);
            }}
            className="w-full mt-2 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition disabled:opacity-50"
          >
            {isProcessingPin ? 'Đang khôi phục...' : 'Khôi phục ngay'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 w-full h-full flex bg-white overflow-hidden relative">
      {/* Sidebar */}
      <div className={`w-full md:w-72 border-r border-slate-200 flex-col bg-slate-50 shrink-0 ${activeRoom ? 'hidden md:flex' : 'flex'}`}>
        {/* Header */}
        <div className="px-4 py-3 border-b border-slate-200 bg-white">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Nhắn tin nội bộ</span>
            <div className={`flex items-center gap-1 text-[10px] font-semibold ${isConnected ? 'text-emerald-500' : 'text-slate-400'}`}>
              {isConnected ? <Wifi size={10} /> : <WifiOff size={10} />}
              {isConnected ? 'Online' : 'Offline'}
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
            <button
              onClick={() => setActiveTab('channels')}
              className={`flex-1 py-1.5 px-3 text-xs font-medium rounded-md transition-all ${
                activeTab === 'channels' ? 'bg-white text-slate-700 shadow-sm' : 'text-slate-500 hover:text-slate-600'
              }`}
            >
              <Hash size={12} className="inline mr-1" />
              Kênh
            </button>
            <button
              onClick={() => { setActiveTab('dms'); fetchConversations(); }}
              className={`flex-1 py-1.5 px-3 text-xs font-medium rounded-md transition-all ${
                activeTab === 'dms' ? 'bg-white text-slate-700 shadow-sm' : 'text-slate-500 hover:text-slate-600'
              }`}
            >
              <MessageCircle size={12} className="inline mr-1" />
              Tin nhắn
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="p-3 border-b border-slate-200 bg-white space-y-2">
          {activeTab === 'channels' ? (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
              <input
                type="text"
                placeholder="Tìm kênh..."
                value={roomSearch}
                onChange={(e) => setRoomSearch(e.target.value)}
                className={`w-full bg-slate-100 border-none rounded-lg py-2 pl-8 pr-3 text-sm text-slate-700 placeholder-slate-400 outline-none focus:ring-2 ${themeRing.split(' ')[0]}`}
              />
            </div>
          ) : (
            <button
              onClick={() => setShowNewChat(true)}
              className={`w-full ${themeBg} text-white py-2 px-3 rounded-lg text-sm font-medium ${themeHover} transition-all flex items-center justify-center gap-2`}
            >
              <Users size={14} />
              Tin nhắn mới
            </button>
          )}
        </div>

        {/* Action Buttons */}
        <div className="p-3 border-b border-slate-200 bg-white space-y-2">
          {isManager && (
            <button
              onClick={() => setShowCreateRoomModal(true)}
              className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold ${themeBg} text-white ${themeHover} transition-colors`}
            >
              <Plus size={14} /> Tạo phòng
            </button>
          )}
        </div>

        {/* Room List */}
        <div className="flex-1 overflow-y-auto p-3">
          {loadingRooms ? (
            <div className="flex flex-col gap-2 p-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-9 bg-slate-200 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : activeTab === 'channels' ? (
            <>
              {pinnedRooms.length > 0 && (
                <>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 mb-2 mt-1 flex items-center gap-1">
                    <Pin size={10} /> Đã ghim
                  </p>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="space-y-1 mb-3"
                  >
                    {pinnedRooms.map((room, idx) => {
                      const Icon = getRoomIcon(room);
                      return (
                        <motion.button
                          key={room.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.05 }}
                          onClick={() => joinRoom(room.id)}
                          className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-all ${
                            activeRoom === room.id
                              ? `${themeBg} text-white shadow-md`
                              : 'text-slate-600 hover:bg-white hover:shadow-sm'
                          }`}
                        >
                          <Icon size={15} />
                          <span className="text-sm font-medium truncate flex-1 text-left flex items-center gap-1">
                            {room.name}
                            {room.isPrivate && <Lock size={10} />}
                          </span>
                          {room.unread > 0 && (
                            <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                              {room.unread}
                            </span>
                          )}
                        </motion.button>
                      );
                    })}
                  </motion.div>
                </>
              )}
              {normalRooms.length > 0 && (
                <>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 mb-2">Kênh</p>
                  <div className="space-y-1">
                    {normalRooms.map(room => {
                      const Icon = getRoomIcon(room);
                      return (
                        <button
                          key={room.id}
                          onClick={() => joinRoom(room.id)}
                          className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-all ${
                            activeRoom === room.id
                              ? `${themeBg} text-white shadow-md`
                              : 'text-slate-600 hover:bg-white hover:shadow-sm'
                          }`}
                        >
                          <Icon size={15} />
                          <span className="text-sm font-medium truncate flex-1 text-left flex items-center gap-1">
                            {room.name}
                            {room.isPrivate && <Lock size={10} />}
                          </span>
                          {room.unread > 0 && (
                            <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                              {room.unread}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </>
          ) : (
            <div className="space-y-1">
              {conversations.length === 0 ? (
                <div className="p-4 text-center text-slate-400 text-sm">Chưa có cuộc trò chuyện nào</div>
              ) : (
                conversations.map(conv => (
                  <button
                    key={conv.id}
                    onClick={() => joinRoom(conv.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-all ${
                      activeRoom === conv.id
                        ? `${themeBg} text-white shadow-md`
                        : 'text-slate-600 hover:bg-white hover:shadow-sm'
                    }`}
                  >
                    <div className="relative shrink-0">
                      <img src={conv.avatar} alt={conv.name} className="w-8 h-8 rounded-full bg-slate-200" />
                      {onlineUsers.has(conv.userId) && (
                        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full"></span>
                      )}
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <p className="text-sm font-medium truncate">{conv.name}</p>
                      {conv.lastMessage && (
                        <p className="text-xs text-slate-400 truncate">{conv.lastMessage.text}</p>
                      )}
                    </div>
                    {conv.unreadCount > 0 && (
                      <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                        {conv.unreadCount}
                      </span>
                    )}
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className={`flex-1 flex-col bg-white min-w-0 ${!activeRoom ? 'hidden md:flex' : 'flex'} absolute md:relative inset-0 md:inset-auto`}>
        {/* Chat Header */}
        <div className="h-16 px-3 md:px-5 border-b border-slate-200 flex items-center justify-between shrink-0 bg-white">
          <div className="flex items-center gap-2 md:gap-3">
            <button
              onClick={() => joinRoom('')}
              className="md:hidden p-2 -ml-1 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
            <div className={`p-2 ${themeIconBg} ${themeText} rounded-lg hidden md:block`}>
              <Hash size={18} />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800 text-sm">{activeRoomData?.name || 'Chọn kênh'}</h3>
              <p className="text-xs text-slate-500">
                {typingInRoom.length > 0
                  ? `${typingInRoom.map(u => u.userName).join(', ')} đang nhập...`
                  : activeRoomData?.description || 'Chọn một kênh bên trái để xem hội thoại'
                }
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSearch}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
            >
              <Search size={18} />
            </button>
            {isE2EEReady && !hasDbBackup && (
              <button 
                onClick={() => { setPinInput(''); setPinError(''); setShowSetupPinModal(true); }}
                className="flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg border border-blue-200 cursor-pointer transition-colors" title="Thiết lập mã PIN khôi phục">
                <Shield size={10} />
                <span className="text-[10px] font-semibold uppercase">Tạo PIN Backup</span>
              </button>
            )}
            {isE2EEReady ? (
              <button 
                onClick={() => setShowDeviceModal(true)}
                className="flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg border border-emerald-100 transition-colors" title="Đã bảo mật E2EE - Bấm để Quản lý thiết bị"
              >
                <Lock size={10} />
                <span className="text-[10px] font-semibold">E2EE DEVICES</span>
              </button>
            ) : (
              <div className="flex items-center gap-1 px-2 py-1 bg-amber-50 text-amber-600 rounded-lg border border-amber-100" title="Chưa cấu hình E2EE. Tin nhắn có thể không an toàn.">
                <Lock size={10} />
                <span className="text-[10px] font-semibold">NO E2EE</span>
              </div>
            )}
            {activeRoomData && !activeRoomData.isPinned && (user?.role === 'ADMIN' || user?.role === 'MANAGER' || activeRoomData.isDirectMessage) && (
              <button
                onClick={() => {
                  setPendingRoomId(activeRoom);
                  setPendingRoomName(activeRoomData?.name || '');
                  setShowDeleteRoomModal(true);
                }}
                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                title="Xóa hộp thoại"
              >
                <Trash2 size={18} />
              </button>
            )}
            <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all">
              <MoreVertical size={18} />
            </button>
          </div>
        </div>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="px-5 py-3 border-b border-slate-200 bg-amber-50">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-amber-700">Kết quả tìm kiếm: {searchResults.length} tin nhắn</p>
              <button onClick={() => setSearchResults([])} className="text-amber-600 hover:text-amber-800">
                <X size={14} />
              </button>
            </div>
          </div>
        )}

        {/* New Chat Modal */}
        {showNewChat && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-xl shadow-2xl w-96 p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-slate-800">Tin nhắn mới</h3>
                <button onClick={() => setShowNewChat(false)} className="text-slate-400 hover:text-slate-600">
                  <X size={18} />
                </button>
              </div>
              <input
                type="text"
                placeholder="Tìm người dùng..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="w-full bg-slate-100 border-none rounded-lg py-2 px-3 text-sm text-slate-700 placeholder-slate-400 outline-none focus:ring-2 focus:ring-blue-200 mb-3"
              />
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {loadingSearch ? (
                  <div className="text-center text-slate-400 text-sm py-2">Đang tìm...</div>
                ) : userSearchResults.length === 0 ? (
                  <div className="text-center text-slate-400 text-sm py-2">
                    {userSearch ? 'Không tìm thấy người dùng' : 'Nhập tên để tìm kiếm'}
                  </div>
                ) : (
                  userSearchResults.map(u => (
                    <button
                      key={u.id}
                      onClick={() => handleNewChat(u.id)}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-100 transition-all"
                    >
                      <img src={u.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(u.name)}`} alt={u.name} className="w-8 h-8 rounded-full bg-slate-200" />
                      <div className="text-left">
                        <p className="text-sm font-medium text-slate-700">{u.name}</p>
                        <p className="text-xs text-slate-400">{u.email}</p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Create Room Modal */}
        {showCreateRoomModal && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-xl shadow-2xl w-96 p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-slate-800">Tạo phòng mới</h3>
                <button onClick={() => setShowCreateRoomModal(false)} className="text-slate-400 hover:text-slate-600">
                  <X size={18} />
                </button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Tên phòng</label>
                  <input
                    type="text"
                    value={newRoomName}
                    onChange={(e) => setNewRoomName(e.target.value)}
                    placeholder="VD: Nhóm dự án A"
                    className="w-full bg-slate-100 border-none rounded-lg py-2.5 px-3 text-sm text-slate-700 placeholder-slate-400 outline-none focus:ring-2 focus:ring-blue-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Mô tả (tùy chọn)</label>
                  <input
                    type="text"
                    value={newRoomDesc}
                    onChange={(e) => setNewRoomDesc(e.target.value)}
                    placeholder="VD: Thảo luận về dự án..."
                    className="w-full bg-slate-100 border-none rounded-lg py-2.5 px-3 text-sm text-slate-700 placeholder-slate-400 outline-none focus:ring-2 focus:ring-blue-200"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newRoomHasCode}
                      onChange={(e) => setNewRoomHasCode(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-300 text-blue-500 focus:ring-blue-200"
                    />
                    <span className="text-sm text-slate-600">Bảo vệ bằng mã</span>
                  </label>
                </div>
                {newRoomHasCode && (
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Mã bảo mật</label>
                    <input
                      type="password"
                      value={newRoomCode}
                      onChange={(e) => setNewRoomCode(e.target.value)}
                      placeholder="Nhập mã bảo mật"
                      className="w-full bg-slate-100 border-none rounded-lg py-2.5 px-3 text-sm text-slate-700 placeholder-slate-400 outline-none focus:ring-2 focus:ring-blue-200"
                    />
                    <p className="text-xs text-slate-400 mt-1">Chia sẻ mã này cho người muốn tham gia</p>
                  </div>
                )}
              </div>
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => setShowCreateRoomModal(false)}
                  className="flex-1 px-3 py-2 rounded-lg text-sm font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                >
                  Hủy
                </button>
                <button
                  onClick={handleCreateRoom}
                  disabled={creatingRoom}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium ${themeBg} text-white ${themeHover} transition-colors disabled:opacity-50`}
                >
                  {creatingRoom ? 'Đang tạo...' : 'Tạo phòng'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Room Modal */}
        {showDeleteRoomModal && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-xl shadow-2xl w-96 p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-slate-800">Xóa phòng</h3>
                <button onClick={() => setShowDeleteRoomModal(false)} className="text-slate-400 hover:text-slate-600">
                  <X size={18} />
                </button>
              </div>
              <p className="text-sm text-slate-600 mb-4">
                Bạn có chắc muốn xóa <strong>"{pendingRoomName}"</strong>? 
                {rooms.find(r => r.id === pendingRoomId)?.isDirectMessage 
                  ? " Đoạn chat cá nhân sẽ bị xóa hoàn toàn khỏi cả 2 máy." 
                  : " Tin nhắn trong phòng sẽ được lưu trữ mềm."}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowDeleteRoomModal(false)}
                  className="flex-1 px-3 py-2 rounded-lg text-sm font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                >
                  Hủy
                </button>
                <button
                  onClick={handleDeleteRoom}
                  className="flex-1 px-3 py-2 rounded-lg text-sm font-medium bg-red-500 text-white hover:bg-red-600 transition-colors"
                >
                  Xóa
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Setup PIN Backup Modal */}
        {showSetupPinModal && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-xl shadow-2xl w-96 p-4 md:p-6 text-center">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-slate-800 mx-auto text-lg">Tạo mã PIN Bảo mật</h3>
                <button onClick={() => setShowSetupPinModal(false)} className="text-slate-400 hover:text-slate-600 absolute right-6 top-6">
                  <X size={18} />
                </button>
              </div>
              <p className="text-sm text-slate-500 mb-6">Mã PIN gồm 6 số sẽ giúp bạn đăng nhập tin nhắn trên thiết bị khác mà không làm mất nội dung bảo mật (E2EE).</p>
              
              <input
                type="password"
                maxLength={6}
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))}
                placeholder="Nhập 6 số"
                className="w-full text-center text-3xl tracking-[0.5em] font-mono bg-slate-100 border-none rounded-xl py-4 focus:ring-2 focus:ring-blue-200 mb-2"
              />
              {pinError && <p className="text-sm text-red-500 mb-4">{pinError}</p>}
              
              <button
                disabled={pinInput.length !== 6 || isProcessingPin}
                onClick={async () => {
                  setIsProcessingPin(true);
                  setPinError('');
                  const ok = await setupRecoveryBackup(pinInput);
                  if (!ok) setPinError('Có lỗi khi tạo backup. Vui lòng thử lại sau.');
                  else {
                    alert('Sao lưu E2EE thành công! Hãy nhớ kỹ mã PIN này.');
                    setShowSetupPinModal(false);
                  }
                  setIsProcessingPin(false);
                }}
                className="w-full mt-4 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition disabled:opacity-50"
              >
                {isProcessingPin ? 'Đang mã hóa...' : 'Xác nhận mã PIN'}
              </button>
            </div>
          </div>
        )}

        {/* Device Management Modal ([PRO LEVEL]) */}
        {showDeviceModal && (
          <DeviceManagementModal onClose={() => setShowDeviceModal(false)} />
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3 bg-slate-50/50 flex flex-col">
          {!activeRoom ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 min-h-[200px]">
              <MessageSquare className="w-14 h-14 mb-4 opacity-40" />
              <p className="text-sm font-medium text-slate-500">Chọn một kênh để bắt đầu trò chuyện</p>
            </div>
          ) : isLoadingMessages ? (
            <div className="flex-1 flex flex-col items-center justify-center min-h-[200px]">
              <div className="flex flex-col gap-3 w-full max-w-sm">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-200 animate-pulse shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 w-24 bg-slate-200 rounded animate-pulse" />
                      <div className="h-10 bg-slate-100 rounded-2xl animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : roomMessages.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 min-h-[200px]">
              <MessageSquare className="w-14 h-14 mb-4 opacity-40" />
              <p className="text-sm font-medium text-slate-500">Chưa có tin nhắn nào</p>
              <ChevronRight className="w-5 h-5 mt-3 text-slate-300" />
            </div>
          ) : (
            <>
              <AnimatePresence mode="popLayout">
                {roomMessages.map((msg, idx) => {
                  const isMe = msg.userId === (user?.id || 'user1');
                  const showAvatar = idx === 0 || roomMessages[idx - 1].userId !== msg.userId;
                  const avatarUrl = msg.userAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(msg.userName || msg.userId)}`;

                  return (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ duration: 0.2 }}
                      className={`flex gap-3 group ${isMe ? 'flex-row-reverse' : ''}`}
                    >
                      <div className="shrink-0">
                        {showAvatar ? (
                          <img src={avatarUrl} alt={msg.userName} className="w-8 h-8 rounded-lg bg-slate-200 object-cover" />
                        ) : (
                          <div className="w-8" />
                        )}
                      </div>
                      <div className={`max-w-[70%] space-y-1 ${isMe ? 'items-end' : 'items-start'}`}>
                        {showAvatar && (
                          <div className={`flex items-center gap-2 ${isMe ? 'flex-row-reverse mr-1' : 'ml-1'}`}>
                            <p className="text-xs font-semibold text-slate-600">{msg.userName}</p>
                            <p className="text-[10px] text-slate-400">{formatTime(msg.timestamp)}</p>
                          </div>
                        )}
                        <div className="relative group/menu">
                          {/* Replied Message Block */}
                          {msg.parentMessageText && (
                            <div className={`mb-1 flex ${isMe ? 'justify-end pr-2' : 'justify-start pl-2'}`}>
                              <div className={`text-xs px-3 py-1.5 rounded-xl opacity-80 cursor-pointer hover:opacity-100 transition-opacity ${
                                isMe ? 'bg-black/10 text-slate-700' : 'bg-slate-200/80 text-slate-600'
                              }`}>
                                <p className="font-semibold truncate max-w-[200px] mb-0.5">{msg.parentMessageUserName || 'Người dùng'}</p>
                                <p className="truncate max-w-[200px]">
                                  {messages.find((m: any) => m.id === msg.parentMessageId)?.decryptedContent || 
                                   messages.find((m: any) => m.id === msg.parentMessageId)?.text || 
                                   msg.parentMessageText}
                                </p>
                              </div>
                            </div>
                          )}
                          <motion.div
                            whileHover={{ scale: 1.01 }}
                            className={`px-4 py-2.5 text-sm ${
                              isMe
                                ? `${themeBg} text-white rounded-2xl rounded-tr-sm`
                                : 'bg-white text-slate-700 rounded-2xl rounded-tl-sm shadow-sm border border-slate-100'
                            }`}
                          >
                            {msg.text}
                          </motion.div>
                          {/* Action buttons on hover */}
                          <div className={`absolute top-1/2 -translate-y-1/2 ${isMe ? 'left-0 -translate-x-full' : 'right-0 translate-x-full'} flex items-center gap-1 bg-white rounded-lg shadow-lg border border-slate-200 p-1 opacity-0 group-hover/menu:opacity-100 transition-opacity z-10`}>
                            {/* Reaction button */}
                            <div className="relative">
                              <button
                                onClick={() => {
                                  if (showEmojiPicker === msg.id) {
                                    setShowEmojiPicker(null);
                                  } else {
                                    setShowEmojiPicker(msg.id);
                                  }
                                }}
                                className="p-1.5 text-slate-400 hover:text-amber-500 hover:bg-amber-50 rounded transition-all"
                                title="Thêm cảm xúc"
                              >
                                <Smile size={14} />
                              </button>
                              {/* Emoji picker */}
                              {showEmojiPicker === msg.id && (
                                <div className={`absolute top-full mt-1 ${isMe ? 'left-0' : 'right-0'} bg-white rounded-lg shadow-lg border border-slate-200 p-2 flex gap-1 z-20`}>
                                  {COMMON_EMOJIS.map(emoji => (
                                    <button
                                      key={emoji}
                                      onClick={() => { handleReaction(msg.id, emoji); setShowEmojiPicker(null); }}
                                      className="p-1 hover:bg-slate-100 rounded text-sm transition-all hover:scale-125"
                                    >
                                      {emoji}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                            {/* Reply button */}
                            <button
                              onClick={() => setReplyingTo(msg)}
                              className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded transition-all"
                              title="Trả lời"
                            >
                              <MessageCircle size={14} />
                            </button>
                            {/* Recall button - only for own messages */}
                            {isMe && (
                              <button
                                onClick={() => handleRecall(msg.id)}
                                className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-all"
                                title="Thu hồi tin nhắn"
                              >
                                <X size={14} />
                              </button>
                            )}
                          </div>
                        </div>
                        {msg.reactions != null && msg.reactions.length > 0 && (
                          <div className={`flex gap-1 flex-wrap ${isMe ? 'justify-end' : 'justify-start'} ml-1`}>
                            {msg.reactions.map((reaction, i) => (
                              <button
                                key={i}
                                onClick={() => handleReaction(msg.id, reaction.emoji)}
                                className="px-1.5 py-0.5 bg-slate-100 rounded-full text-xs hover:bg-slate-200 flex items-center gap-1"
                              >
                                <span>{reaction.emoji}</span>
                              </button>
                            ))}
                          </div>
                        )}

                        {/* Reply count */}
                        {msg.replyCount != null && msg.replyCount > 0 && !msg.parentMessageId && (
                          <button
                            onClick={() => handleViewThread(msg)}
                            className={`text-xs ${themeText} hover:underline flex items-center gap-1 ${isMe ? 'justify-end' : 'justify-start'} ml-1`}
                          >
                            <MessageCircle size={12} />
                            {msg.replyCount} trả lời
                          </button>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
              <div ref={scrollRef} />
            </>
          )}
        </div>

        {/* Reply preview */}
        {replyingTo && (
          <div className="px-4 py-2 bg-slate-50 border-t border-slate-200 flex items-center gap-2">
            <MessageCircle size={14} className={themeText} />
            <span className="text-xs text-slate-500">Đang trả lời</span>
            <span className="text-xs text-slate-700 font-medium truncate flex-1">{replyingTo.text}</span>
            <button onClick={() => setReplyingTo(null)} className="p-1 hover:bg-slate-200 rounded">
              <X size={14} className="text-slate-500" />
            </button>
          </div>
        )}

        {/* Input */}
        <div className="p-4 border-t border-slate-200 shrink-0 bg-white">
          {/* Emoji Panel */}
          {showStickerPanel && (
            <div className="mb-3 bg-white border border-slate-200 rounded-xl shadow-lg p-3 flex gap-2 flex-wrap">
              {COMMON_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => {
                    sendMessage(emoji, activeRoom);
                    setShowStickerPanel(false);
                  }}
                  className="w-10 h-10 flex items-center justify-center text-2xl hover:bg-slate-100 rounded-lg transition-all hover:scale-110"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}

          <form onSubmit={handleSendMessage} className="relative flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowStickerPanel(!showStickerPanel)}
              className="p-2.5 text-slate-400 hover:text-amber-500 hover:bg-amber-50 rounded-xl transition-all"
              title="Sticker"
            >
              <Smile size={18} />
            </button>
            <input
              ref={inputRef}
              type="text"
              value={inputText}
              onChange={(e) => handleInputChange(e.target.value)}
              placeholder={activeRoom ? 'Nhập tin nhắn... (gõ @ để mention)' : 'Chọn một kênh để nhắn tin'}
              disabled={!activeRoom}
              className={`flex-1 bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-sm text-slate-700 placeholder-slate-400 outline-none focus:ring-2 ${themeRing} transition-all disabled:opacity-60 disabled:cursor-not-allowed`}
            />
            <button
              type="submit"
              disabled={!activeRoom || !inputText.trim()}
              className={`${themeBg} text-white p-2.5 rounded-xl ${themeHover} disabled:opacity-50 disabled:cursor-not-allowed transition-all`}
            >
              <Send size={18} />
            </button>
          </form>

          {/* Emoji picker for input */}
          {showEmojiPicker === 'input' && (
            <div className="absolute bottom-20 right-20 bg-white rounded-lg shadow-lg border border-slate-200 p-2 flex gap-1 z-20">
              {COMMON_EMOJIS.map(emoji => (
                <button
                  key={emoji}
                  onClick={() => { setInputText(inputText + emoji); setShowEmojiPicker(null); }}
                  className="p-2 hover:bg-slate-100 rounded text-lg"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}

          {/* @Mention dropdown */}
          {showMentionDropdown && (
            <div className="absolute bottom-full mb-2 left-0 w-72 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden z-30">
              <div className="px-3 py-2 bg-slate-50 border-b border-slate-200">
                <p className="text-xs font-semibold text-slate-500">Nhắc đến</p>
              </div>
              <div className="max-h-60 overflow-y-auto py-1">
                {mentionFilter.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-slate-400 text-center">Không tìm thấy người dùng</div>
                ) : (
                  mentionFilter.map(u => (
                    <button
                      key={u.id}
                      onClick={() => handleMentionSelect(u)}
                      className="w-full flex items-center gap-3 px-3 py-2 hover:bg-slate-50 transition-all"
                    >
                      <img src={u.avatar} alt={u.name} className="w-8 h-8 rounded-full bg-slate-200" />
                      <div className="text-left">
                        <p className="text-sm font-medium text-slate-700">{u.name}</p>
                        <p className="text-xs text-slate-400">{u.email}</p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
