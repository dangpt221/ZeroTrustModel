import { AnimatePresence, motion } from 'framer-motion';
import { ChevronRight, Hash, Lock, MessageSquare, MoreVertical, Pin, Search, Send, Shield, Wifi, WifiOff } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ChatMessage, ChatRoom, useChat } from '../hooks/useChat';

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

const COMMON_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🎉', '🔥', '👀'];

export const Messaging: React.FC = () => {
  const { user } = useAuth();
  const {
    messages, setMessages, activeRoom, joinRoom, sendMessage,
    isConnected, typingUsers, startTyping, stopTyping,
    addReaction, markAsRead, conversations, fetchConversations,
    createConversation, searchMessages, getReplies
  } = useChat();

  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [activeTab, setActiveTab] = useState<'channels' | 'dms'>('channels');
  const [showSearch, setShowSearch] = useState(false);
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
  const scrollRef = useRef<HTMLDivElement>(null);

  // Fetch Rooms on Mount
  useEffect(() => {
    const fetchData = async () => {
      setLoadingRooms(true);
      try {
        const res = await fetch('/api/messaging/rooms', { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          setRooms(data.rooms || []);
          if (data.rooms && data.rooms.length > 0 && !activeRoom) {
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

  // Fetch Messages when Active Room changes
  useEffect(() => {
    if (!activeRoom) return;
    setLoadingMessages(true);
    const fetchMessages = async () => {
      try {
        const res = await fetch(`/api/messages?room=${activeRoom}`, { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          setMessages(Array.isArray(data) ? data : []);

          const msgs = Array.isArray(data) ? data : [];
          msgs.forEach((msg: ChatMessage) => {
            if (!msg.isRead && msg.userId !== user?.id) {
              markAsRead(msg.id, activeRoom);
            }
          });
        }
      } catch (err) {
        console.error('Failed to fetch messages', err);
        setMessages([]);
      } finally {
        setLoadingMessages(false);
      }
    };
    fetchMessages();
    joinRoom(activeRoom);
  }, [activeRoom, joinRoom, setMessages, user?.id, markAsRead]);

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

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !user || !activeRoom) return;

    sendMessage(inputText.trim(), activeRoom, replyingTo?.id || undefined);
    setInputText('');
    setReplyingTo(null);
    stopTyping(activeRoom);
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
  }, [userSearch, user]);

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

  const roomMessages = messages.filter(m => m.room === activeRoom);
  const typingInRoom = typingUsers.get(activeRoom || '') || [];

  return (
    <div className="flex-1 w-full h-full flex bg-white overflow-hidden">
      {/* Sidebar */}
      <div className="w-72 border-r border-slate-200 flex flex-col bg-slate-50 shrink-0">
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
          {isMember && (
            <button
              onClick={() => setShowJoinRoomModal(true)}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
            >
              <Key size={14} /> Vào phòng
            </button>
          )}
        </div>

        {/* Action Buttons */}
        <div className="p-3 border-b border-slate-200 bg-white space-y-2">
          {isManager && (
            <button
              onClick={() => setShowCreateRoomModal(true)}
              className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold ${themeBg} text-white hover:${themeHover} transition-colors`}
            >
              <Plus size={14} /> Tạo phòng
            </button>
          )}
          {isMember && (
            <button
              onClick={() => setShowJoinRoomModal(true)}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
            >
              <Key size={14} /> Vào phòng
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
                      const Icon = room.type === 'channel' ? Hash : Shield;
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
                          <span className="text-sm font-medium truncate flex-1 text-left">{room.name}</span>
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
                      const Icon = room.type === 'channel' ? Hash : Shield;
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
                          <span className="text-sm font-medium truncate flex-1 text-left">{room.name}</span>
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
                    <img src={conv.avatar} alt={conv.name} className="w-8 h-8 rounded-full bg-slate-200" />
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
      <div className="flex-1 flex flex-col bg-white min-w-0">
        {/* Chat Header */}
        <div className="h-16 px-5 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className={`p-2 ${themeIconBg} ${themeText} rounded-lg`}>
              {activeRoomData && <Hash size={18} />}
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
              onClick={() => setShowSearch(true)}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
            >
              <Search size={18} />
            </button>
            <div className="flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-600 rounded-lg border border-emerald-100">
              <Lock size={10} />
              <span className="text-[10px] font-semibold">E2EE</span>
            </div>
            {isManager && activeRoomData && !activeRoomData.isPinned && (
              <button
                onClick={() => {
                  setPendingRoomId(activeRoom);
                  setPendingRoomName(activeRoomData?.name || '');
                  setShowDeleteRoomModal(true);
                }}
                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                title="Xóa kênh"
              >
                <Trash2 size={18} />
              </button>
            )}
            <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all">
              <MoreVertical size={18} />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3 bg-slate-50/50 flex flex-col">
          {!activeRoom ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 min-h-[200px]">
              <MessageSquare className="w-14 h-14 mb-4 opacity-40" />
              <p className="text-sm font-medium text-slate-500">Chọn một kênh để bắt đầu trò chuyện</p>
            </div>
          ) : loadingMessages ? (
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
                      {!isMe && (
                        <div className="shrink-0">
                          {showAvatar ? (
                            <img src={avatarUrl} alt={msg.userName} className="w-8 h-8 rounded-lg bg-slate-200 object-cover" />
                          ) : (
                            <div className="w-8" />
                          )}
                        </div>
                      )}
                      <div className={`max-w-[70%] space-y-1 ${isMe ? 'items-end' : 'items-start'}`}>
                        {showAvatar && !isMe && (
                          <div className="flex items-center gap-2 ml-1">
                            <p className="text-xs font-semibold text-slate-600">{msg.userName}</p>
                            <p className="text-[10px] text-slate-400">{formatTime(msg.timestamp)}</p>
                          </div>
                        )}
                        <motion.div
                          whileHover={{ scale: 1.01 }}
                          className={`px-4 py-2.5 rounded-2xl text-sm ${
                            isMe 
                              ? `${themeBg} text-white rounded-br-sm` 
                              : 'bg-white text-slate-700 rounded-bl-sm shadow-sm border border-slate-100'
                          }`}
                        >
                          {msg.text}
                        </motion.div>
                        {msg.reactions && msg.reactions.length > 0 && (
                          <div className={`flex gap-1 flex-wrap ${isMe ? 'justify-end' : 'justify-start'} ml-1`}>
                            {msg.reactions.map((reaction, i) => (
                              <button
                                key={i}
                                onClick={() => handleReaction(msg.id, reaction.emoji)}
                                className="px-1.5 py-0.5 bg-slate-100 rounded-full text-xs hover:bg-slate-200"
                              >
                                {reaction.emoji}
                              </button>
                            ))}
                          </div>
                        )}

                        {/* Reply count */}
                        {msg.replyCount && msg.replyCount > 0 && !msg.parentMessageId && (
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
          {/* Sticker Panel */}
          {showStickerPanel && (
            <div className="mb-3 bg-white border border-slate-200 rounded-xl shadow-lg p-3 max-h-64 overflow-hidden">
              <div className="flex gap-1 mb-2 overflow-x-auto pb-1">
                {stickerCategories.map((cat, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      const el = document.getElementById(`sticker-cat-${i}`);
                      if (el) el.scrollIntoView({ block: 'nearest', inline: 'center' });
                    }}
                    className="px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg whitespace-nowrap"
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
              <div className="max-h-44 overflow-y-auto">
                {stickerCategories.map((cat, i) => (
                  <div key={i} id={`sticker-cat-${i}`} className="grid grid-cols-10 gap-1 mb-2">
                    {cat.stickers.map((s, j) => (
                      <button
                        key={j}
                        onClick={() => {
                          sendMessage(s, activeRoom);
                          setShowStickerPanel(false);
                        }}
                        className="w-8 h-8 flex items-center justify-center text-xl hover:bg-slate-100 rounded-lg transition-all hover:scale-110"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
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
        </div>
      </div>
    </div>
  );
};
