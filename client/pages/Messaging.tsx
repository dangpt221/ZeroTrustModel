import React, { useState, useEffect, useRef } from 'react';
import { Send, Shield, Lock, Search, Hash, Pin, MoreVertical, Wifi, WifiOff, MessageSquare, ChevronRight, Plus, Key, X, Copy, Check, Trash2, Smile } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';

import { useChat, ChatMessage, ChatRoom } from '../hooks/useChat';
import { chatManagementApi } from '../api';

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

export const Messaging: React.FC = () => {
  const { user } = useAuth();
  const { messages, setMessages, activeRoom, joinRoom, sendMessage, isConnected } = useChat();
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  
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

  // Modal states
  const [showCreateRoomModal, setShowCreateRoomModal] = useState(false);
  const [showJoinRoomModal, setShowJoinRoomModal] = useState(false);
  const [showJoinCodeModal, setShowJoinCodeModal] = useState(false);
  const [showDeleteRoomModal, setShowDeleteRoomModal] = useState(false);
  const [pendingRoomId, setPendingRoomId] = useState<string | null>(null);
  const [pendingRoomName, setPendingRoomName] = useState<string>('');
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomDescription, setNewRoomDescription] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [createdRoomCode, setCreatedRoomCode] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [loadingCreate, setLoadingCreate] = useState(false);
  const [loadingJoin, setLoadingJoin] = useState(false);
  const [loadingDelete, setLoadingDelete] = useState(false);
  const [showStickerPanel, setShowStickerPanel] = useState(false);

  // Stickers list (using free emoji/sticker URLs)
  const stickerCategories = [
    { name: 'Cảm xúc', stickers: ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '😮‍💨', '🤥', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🤧', '🥵', '🥶', '🥴', '😵', '🤯', '🤠', '🥳', '🥸', '😎', '🤓', '🧐', '😕', '😟', '🙁', '😮', '😯', '😲', '😳', '🥺', '😦', '😧', '😨', '😰', '😥', '😢', '😭', '😱', '😖', '😣', '😞', '😓', '😩', '😫', '🥱', '😤', '😡', '😠', '🤬', '😈', '👿', '💀', '☠️', '💩', '🤡', '👹', '👺', '👻', '👽', '👾', '🤖'] },
    { name: 'Tay & Người', stickers: ['👍', '👎', '👊', '✊', '🤛', '🤜', '🤝', '👏', '🙌', '👐', '🤲', '🙏', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '👇', '☝️', '✋', '🤚', '🖐️', '🖖', '👋', '🤏', '✍️', '🙏', '💪', '🦾', '🦿', '🦵', '🦶', '👂', '🦻', '👃', '🧠', '🫀', '🫁', '🦷', '🦴', '👀', '👁️', '👅', '👄'] },
    { name: 'Hoạt động', stickers: ['👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '👇', '☝️', '🫵', '🙏', '💪', '🦾', '🦿', '🦵', '🦶', '👣', '🧳', '🌂', '☂️', '🧵', '🪡', '🧶', '🪢'] },
    { name: 'Động vật', stickers: ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐻‍❄️', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🙈', '🙉', '🙊', '🐒', '🐔', '🐧', '🐦', '🐤', '🐣', '🐥', '🦆', '🦅', '🦉', '🦇', '🐺', '🐗', '🐴', '🦄', '🐝', '🪱', '🐛', '🦋', '🐌', '🐞', '🐜', '🪰', '🪲', '🪳', '🦟', '🦗', '🕷️', '🕸️', '🦂', '🐢', '🐍', '🦎', '🦖', '🦕', '🐙', '🦑', '🦐', '🦞', '🦀', '🐡', '🐠', '🐟', '🐬', '🐳', '🐋', '🦈', '🐊', '🐅', '🐆', '🦓', '🦍', '🦧', '🦣', '🐘', '🦛', '🦏', '🐪', '🐫', '🦒', '🦘', '🦬', '🦕', '🐇', '🦔', '🐿️', '🦇', '🐉', '🐲'] },
    { name: 'Đồ ăn', stickers: ['🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐', '🍈', '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🥑', '🥦', '🥬', '🥒', '🌶️', '🫑', '🌽', '🥕', '🧄', '🧅', '🥔', '🍠', '🥐', '🥯', '🍞', '🥖', '🥨', '🧀', '🥚', '🍳', '🧈', '🥞', '🧇', '🥓', '🥩', '🍗', '🍖', '🦴', '🌭', '🍔', '🍟', '🍕', '🫓', '🥪', '🥙', '🧆', '🌮', '🌯', '🫔', '🥗', '🥘', '🫕', '🍝', '🍜', '🍲', '🍛', '🍣', '🍱', '🥟', '🦪', '🍤', '🍙', '🍚', '🍘', '🍥', '🥠', '🥮', '🍢', '🍡', '🍧', '🍨', '🍦', '🥧', '🧁', '🍰', '🎂', '🍮', '🍭', '🍬', '🍫', '🍿', '🍩', '🍪', '☕', '🍵', '🧃', '🥤', '🧋', '🍶', '🍺', '🍻', '🥂', '🍷', '🥃', '🍸', '🍹', '🧉', '🍾', '🧊'] },
    { name: 'Cờ vui', stickers: ['⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🥏', '🎱', '🪀', '🏓', '🏸', '🏒', '🏑', '🥍', '🏏', '🪃', '🥅', '⛳', '🪁', '🏹', '🎣', '🤿', '🥊', '🥋', '🎽', '🛹', '🛼', '🛷', '⛸️', '🥌', '🎿', '⛷️', '🏂', '🪂', '🏋️', '🤼', '🤸', '🤺', '⛹️', '🤾', '🏌️', '🏇', '🧘', '🏄', '🏊', '🤽', '🚣', '🧗', '🚵', '🚴', '🏆', '🥇', '🥈', '🥉', '🏅', '🎖️', '🏵️', '🎗️', '🎫', '🎟️', '🎪', '🤹', '🎭', '🩰', '🎨', '🎬', '🎤', '🎧', '🎼', '🎹', '🥁', '🪘', '🎷', '🎺', '🎸', '🪕', '🎻', '🎲', '♟️', '🎯', '🎳', '🎮', '🕹️', '🎰'] },
    { name: 'Trái tim', stickers: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❤️‍🔥', '❤️‍🩹', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '♥️'] },
    { name: 'Ký hiệu', stickers: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '✨', '💫', '⭐', '🌟', '💥', '🔥', '💥', '💢', '💬', '💭', '💤', '👋', '🫶', '🤝', '👌', '✔️', '❌', '❓', '❗', '⁉️', '‼️', '🔴', '🟠', '🟡', '🟢', '🔵', '🟣', '⚫', '⚪', '🟤', '🔶', '🔷', '🔸', '🔹'] },
  ];

  // Fetch Rooms on Mount
  useEffect(() => {
    const fetchRooms = async () => {
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
      } catch (err) {
        console.error('Failed to fetch rooms', err);
      } finally {
        setLoadingRooms(false);
      }
    };
    fetchRooms();
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
  }, [activeRoom, joinRoom, setMessages]);

  const activeRoomData = rooms.find(r => r.id === activeRoom);
  // Filter rooms by department for manager/staff (backend already filters, but add frontend filter as backup)
  const departmentId = user?.departmentId;
  const filteredRooms = rooms.filter(r => {
    const matchesSearch = r.name.toLowerCase().includes(roomSearch.toLowerCase());
    // Manager/Staff can only see system rooms or rooms in their department
    if (isManager && departmentId) {
      return matchesSearch && (r.isPinned || r.departmentId === departmentId);
    }
    return matchesSearch;
  });

  // Phòng được ghim
  const pinnedRooms = filteredRooms.filter(r => r.isPinned);
  const normalRooms = filteredRooms.filter(r => !r.isPinned);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !user || !activeRoom) return;

    sendMessage(inputText.trim(), activeRoom);
    setInputText('');
  };

  const roomMessages = messages.filter(m => m.room === activeRoom);

  return (
    <div className="flex-1 w-full h-full flex bg-white overflow-hidden">
      {/* Sidebar - Danh sách kênh */}
      <div className="w-64 border-r border-slate-200 flex flex-col bg-slate-50 shrink-0">
        {/* Sidebar Header */}
        <div className="px-4 py-3 border-b border-slate-200 bg-white flex items-center justify-between">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Nhắn tin nội bộ</span>
          <div className={`flex items-center gap-1 text-[10px] font-semibold ${isConnected ? 'text-emerald-500' : 'text-slate-400'}`}>
            {isConnected ? <Wifi size={10} /> : <WifiOff size={10} />}
            {isConnected ? 'Online' : 'Offline'}
          </div>
        </div>
        {/* Search */}
        <div className="p-3 border-b border-slate-200 bg-white">
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

        {/* Channels List */}
        <div className="flex-1 overflow-y-auto p-3">
          {loadingRooms ? (
            <div className="flex flex-col gap-2 p-2">
              {[1,2,3].map(i => (
                <div key={i} className="h-9 bg-slate-200 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : rooms.length === 0 ? (
            <div className="p-4 text-center text-slate-400 text-sm">Không có kênh nào</div>
          ) : (
            <>
              {/* Kênh được ghim */}
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
                          onClick={() => {
                            // Staff cần nhập mã để vào phòng private
                            if (isMember && room.isPrivate && !room.isMember) {
                              setPendingRoomId(room.id);
                              setPendingRoomName(room.name);
                              setShowJoinCodeModal(true);
                            } else {
                              joinRoom(room.id);
                            }
                          }}
                          className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-all ${
                            activeRoom === room.id
                              ? `${themeBg} text-white shadow-md`
                              : 'text-slate-600 hover:bg-white hover:shadow-sm'
                          }`}
                        >
                          {room.isPrivate ? <Lock size={15} /> : <Icon size={15} />}
                          <span className="text-sm font-medium truncate flex-1 text-left">{room.name}</span>
                          {room.isPrivate && !room.isMember && isMember && (
                            <Key size={12} className="text-amber-500" />
                          )}
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

              {/* Kênh thường */}
              {normalRooms.length > 0 && (
                <>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 mb-2">Kênh</p>
                  <div className="space-y-1">
                    {normalRooms.map(room => {
                      const Icon = room.type === 'channel' ? Hash : Shield;
                      return (
                        <button
                          key={room.id}
                          onClick={() => {
                            // Staff cần nhập mã để vào phòng private
                            if (isMember && room.isPrivate && !room.isMember) {
                              setPendingRoomId(room.id);
                              setPendingRoomName(room.name);
                              setShowJoinCodeModal(true);
                            } else {
                              joinRoom(room.id);
                            }
                          }}
                          className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-all ${
                            activeRoom === room.id
                              ? `${themeBg} text-white shadow-md`
                              : 'text-slate-600 hover:bg-white hover:shadow-sm'
                          }`}
                        >
                          {room.isPrivate ? <Lock size={15} /> : <Icon size={15} />}
                          <span className="text-sm font-medium truncate flex-1 text-left">{room.name}</span>
                          {room.isPrivate && !room.isMember && isMember && (
                            <Key size={12} className="text-amber-500" />
                          )}
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
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col bg-white min-w-0">
        {/* Chat Header */}
        <div className="h-16 px-5 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className={`p-2 ${themeIconBg} ${themeText} rounded-lg`}>
              {activeRoomData && (() => {
                const Icon = activeRoomData.type === 'channel' ? Hash : Shield;
                return <Icon size={18} />;
              })()}
            </div>
            <div>
              <h3 className="font-semibold text-slate-800 text-sm">{activeRoomData?.name || 'Chọn kênh'}</h3>
              <p className="text-xs text-slate-500">{activeRoomData?.description || 'Chọn một kênh bên trái để xem hội thoại'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
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
              <p className="text-xs mt-1">Nhấn vào kênh bên trái để xem và gửi tin nhắn</p>
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
              <p className="text-xs mt-1">Hãy gửi tin nhắn đầu tiên trong kênh này</p>
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
                      className={`flex gap-3 ${isMe ? 'flex-row-reverse' : ''}`}
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
                        <div className="relative group">
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
                          {/* Recall button - chỉ hiện khi là tin nhắn của mình */}
                          {isMe && (
                            <button
                              onClick={async () => {
                                if (!confirm('Thu hồi tin nhắn này?')) return;
                                try {
                                  const res = await fetch(`/api/messages/${msg.id}`, {
                                    method: 'DELETE',
                                    credentials: 'include',
                                  });
                                  if (res.ok) {
                                    setMessages(prev => prev.filter(m => m.id !== msg.id));
                                  } else {
                                    const data = await res.json();
                                    alert(data.message || 'Không thể thu hồi');
                                  }
                                } catch {
                                  alert('Lỗi khi thu hồi tin nhắn');
                                }
                              }}
                              className="absolute -top-6 right-0 px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded text-[10px] text-slate-500 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 opacity-0 group-hover:opacity-100 transition-all"
                            >
                              Thu hồi
                            </button>
                          )}
                        </div>
                        {msg.reactions && msg.reactions.length > 0 && (
                          <div className={`flex gap-1 ${isMe ? 'justify-end' : 'justify-start'} ml-1`}>
                            {msg.reactions.map((reaction, i) => (
                              <span key={i} className="px-1.5 py-0.5 bg-slate-100 rounded-full text-xs">
                                {reaction.emoji}
                              </span>
                            ))}
                          </div>
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
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={activeRoom ? 'Nhập tin nhắn...' : 'Chọn một kênh để nhắn tin'}
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
        </div>
      </div>

      {/* Create Room Modal (Manager) */}
      <AnimatePresence>
        {showCreateRoomModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            onClick={() => setShowCreateRoomModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-slate-800">Tạo phòng chat mới</h3>
                <button onClick={() => setShowCreateRoomModal(false)} className="text-slate-400 hover:text-slate-600">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Tên phòng</label>
                  <input
                    type="text"
                    value={newRoomName}
                    onChange={e => setNewRoomName(e.target.value)}
                    placeholder="Nhập tên phòng..."
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Mô tả (tùy chọn)</label>
                  <textarea
                    value={newRoomDescription}
                    onChange={e => setNewRoomDescription(e.target.value)}
                    placeholder="Nhập mô tả..."
                    rows={2}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none resize-none"
                  />
                </div>

                {createdRoomCode ? (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                    <p className="text-xs font-semibold text-emerald-700 mb-2">Phòng đã được tạo! Mã tham gia:</p>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-black text-emerald-600 tracking-wider">{createdRoomCode}</span>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(createdRoomCode);
                          setCopiedCode(true);
                          setTimeout(() => setCopiedCode(false), 2000);
                        }}
                        className="p-2 text-emerald-600 hover:bg-emerald-100 rounded-lg transition-colors"
                      >
                        {copiedCode ? <Check size={18} /> : <Copy size={18} />}
                      </button>
                    </div>
                    <p className="text-[10px] text-emerald-600 mt-2">Chia mã này cho nhân viên để họ tham gia phòng</p>
                  </div>
                ) : (
                  <button
                    onClick={async () => {
                      if (!newRoomName.trim()) return;
                      setLoadingCreate(true);
                      try {
                        const res = await chatManagementApi.createRoomWithCode({
                          name: newRoomName.trim(),
                          description: newRoomDescription.trim()
                        });
                        if (res.success) {
                          setCreatedRoomCode(res.joinCode);
                          // Refresh rooms list
                          const roomsRes = await fetch('/api/messaging/rooms', { credentials: 'include' });
                          if (roomsRes.ok) {
                            const data = await roomsRes.json();
                            setRooms(data.rooms || []);
                          }
                        }
                      } catch (err) {
                        console.error('Failed to create room:', err);
                        alert('Tạo phòng thất bại');
                      } finally {
                        setLoadingCreate(false);
                      }
                    }}
                    disabled={!newRoomName.trim() || loadingCreate}
                    className={`w-full py-2.5 rounded-xl font-semibold text-white ${loadingCreate ? 'bg-slate-400' : `${themeBg} ${themeHover}`} transition-colors disabled:opacity-50`}
                  >
                    {loadingCreate ? 'Đang tạo...' : 'Tạo phòng'}
                  </button>
                )}

                {createdRoomCode && (
                  <button
                    onClick={() => {
                      setShowCreateRoomModal(false);
                      setNewRoomName('');
                      setNewRoomDescription('');
                      setCreatedRoomCode(null);
                    }}
                    className="w-full py-2.5 rounded-xl font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                  >
                    Đóng
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Join Room Modal (Staff - từ button) */}
      <AnimatePresence>
        {showJoinRoomModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            onClick={() => setShowJoinRoomModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-slate-800">Vào phòng chat</h3>
                <button onClick={() => setShowJoinRoomModal(false)} className="text-slate-400 hover:text-slate-600">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Mã tham gia</label>
                  <input
                    type="text"
                    value={joinCode}
                    onChange={e => setJoinCode(e.target.value.toUpperCase())}
                    placeholder="Nhập mã..."
                    maxLength={6}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none text-center text-lg tracking-widest font-bold"
                  />
                </div>

                <button
                  onClick={async () => {
                    if (!joinCode.trim()) return;
                    setLoadingJoin(true);
                    try {
                      const res = await chatManagementApi.joinRoomByCode(joinCode.trim());
                      if (res.success) {
                        alert('Tham gia phòng thành công!');
                        setShowJoinRoomModal(false);
                        setJoinCode('');
                        // Refresh rooms list
                        const roomsRes = await fetch('/api/messaging/rooms', { credentials: 'include' });
                        if (roomsRes.ok) {
                          const data = await roomsRes.json();
                          setRooms(data.rooms || []);
                        }
                      }
                    } catch (err: any) {
                      alert(err?.message || 'Mã không hợp lệ');
                    } finally {
                      setLoadingJoin(false);
                    }
                  }}
                  disabled={joinCode.length < 6 || loadingJoin}
                  className="w-full py-2.5 rounded-xl font-semibold text-white bg-emerald-500 hover:bg-emerald-600 transition-colors disabled:opacity-50"
                >
                  {loadingJoin ? 'Đang tham gia...' : 'Tham gia phòng'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Join Code Modal (Staff - khi click vào phòng private) */}
      <AnimatePresence>
        {showJoinCodeModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            onClick={() => setShowJoinCodeModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-slate-800">Nhập mã tham gia</h3>
                <button onClick={() => setShowJoinCodeModal(false)} className="text-slate-400 hover:text-slate-600">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                <p className="text-sm text-slate-600">
                  Phòng <span className="font-semibold text-slate-800">"{pendingRoomName}"</span> yêu cầu mã tham gia. Vui lòng nhập mã được cấp bởi quản lý.
                </p>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Mã tham gia</label>
                  <input
                    type="text"
                    value={joinCode}
                    onChange={e => setJoinCode(e.target.value.toUpperCase())}
                    placeholder="Nhập mã..."
                    maxLength={6}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none text-center text-lg tracking-widest font-bold"
                  />
                </div>

                <button
                  onClick={async () => {
                    if (!joinCode.trim()) return;
                    setLoadingJoin(true);
                    try {
                      const res = await chatManagementApi.joinRoomByCode(joinCode.trim());
                      if (res.success) {
                        setShowJoinCodeModal(false);
                        setJoinCode('');
                        // Refresh rooms list
                        const roomsRes = await fetch('/api/messaging/rooms', { credentials: 'include' });
                        if (roomsRes.ok) {
                          const data = await roomsRes.json();
                          setRooms(data.rooms || []);
                          // Join the room
                          if (pendingRoomId) {
                            joinRoom(pendingRoomId);
                          }
                        }
                        setPendingRoomId(null);
                        setPendingRoomName('');
                      }
                    } catch (err: any) {
                      alert(err?.message || 'Mã không hợp lệ');
                    } finally {
                      setLoadingJoin(false);
                    }
                  }}
                  disabled={joinCode.length < 6 || loadingJoin}
                  className="w-full py-2.5 rounded-xl font-semibold text-white bg-emerald-500 hover:bg-emerald-600 transition-colors disabled:opacity-50"
                >
                  {loadingJoin ? 'Đang tham gia...' : 'Tham gia phòng'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Room Modal */}
      <AnimatePresence>
        {showDeleteRoomModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            onClick={() => setShowDeleteRoomModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-slate-800">Xóa kênh</h3>
                <button onClick={() => setShowDeleteRoomModal(false)} className="text-slate-400 hover:text-slate-600">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                <p className="text-sm text-slate-600">
                  Bạn có chắc chắn muốn xóa kênh <span className="font-semibold text-slate-800">"{pendingRoomName}"</span>? Hành động này không thể hoàn tác.
                </p>

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowDeleteRoomModal(false)}
                    className="flex-1 py-2.5 rounded-xl font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                  >
                    Hủy
                  </button>
                  <button
                    onClick={async () => {
                      if (!pendingRoomId) return;
                      setLoadingDelete(true);
                      try {
                        const res = await chatManagementApi.deleteRoom(pendingRoomId);
                        if (res.success) {
                          setShowDeleteRoomModal(false);
                          setPendingRoomId(null);
                          setPendingRoomName('');
                          // Refresh rooms list and leave current room
                          const roomsRes = await fetch('/api/messaging/rooms', { credentials: 'include' });
                          if (roomsRes.ok) {
                            const data = await roomsRes.json();
                            setRooms(data.rooms || []);
                          }
                        }
                      } catch (err) {
                        console.error('Failed to delete room:', err);
                        alert('Xóa kênh thất bại');
                      } finally {
                        setLoadingDelete(false);
                      }
                    }}
                    disabled={loadingDelete}
                    className="flex-1 py-2.5 rounded-xl font-semibold text-white bg-rose-500 hover:bg-rose-600 transition-colors disabled:opacity-50"
                  >
                    {loadingDelete ? 'Đang xóa...' : 'Xóa kênh'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
