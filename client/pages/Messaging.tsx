import React, { useState, useEffect, useRef } from 'react';
import { Send, Shield, Lock, Search, Hash, Pin, MoreVertical, Wifi, WifiOff, MessageSquare, ChevronRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

import { useChat, ChatMessage, ChatRoom } from '../hooks/useChat';

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
  const filteredRooms = rooms.filter(r => 
    r.name.toLowerCase().includes(roomSearch.toLowerCase())
  );

  // Phòng được ghim
  const pinnedRooms = filteredRooms.filter(r => r.isPinned);
  const normalRooms = filteredRooms.filter(r => !r.isPinned);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
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
                  <div className="space-y-1 mb-3">
                    {pinnedRooms.map(room => {
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
              {roomMessages.map((msg, idx) => {
                const isMe = msg.userId === (user?.id || 'user1');
                const showAvatar = idx === 0 || roomMessages[idx - 1].userId !== msg.userId;
                const avatarUrl = msg.userAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(msg.userName || msg.userId)}`;
                return (
                  <div key={msg.id} className={`flex gap-3 ${isMe ? 'flex-row-reverse' : ''}`}>
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
                      <div
                        className={`px-4 py-2.5 rounded-2xl text-sm ${
                          isMe 
                            ? `${themeBg} text-white rounded-br-sm` 
                            : 'bg-white text-slate-700 rounded-bl-sm shadow-sm border border-slate-100'
                        }`}
                      >
                        {msg.text}
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
                  </div>
                );
              })}
              <div ref={scrollRef} />
            </>
          )}
        </div>

        {/* Input */}
        <div className="p-4 border-t border-slate-200 shrink-0 bg-white">
          <form onSubmit={handleSendMessage} className="relative flex items-center gap-2">
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
    </div>
  );
};
