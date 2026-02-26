
import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';
import { Send, User, Shield, Lock, Search, Hash, MoreVertical, Paperclip, Smile } from 'lucide-react';

interface Message {
  id: string;
  userId: string;
  userName: string;
  text: string;
  timestamp: string;
  room: string;
}

export const Messaging: React.FC = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [activeRoom, setActiveRoom] = useState('general');
  const socketRef = useRef<Socket | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    socketRef.current = io();

    socketRef.current.emit('join_room', activeRoom);

    socketRef.current.on('receive_message', (message: Message) => {
      setMessages(prev => [...prev, message]);
    });

    // Initial fetch
    fetch('http://localhost:5000/api/messages')
      .then(res => res.json())
      .then(data => setMessages(data.filter((m: any) => m.room === activeRoom)));

    return () => {
      socketRef.current?.disconnect();
    };
  }, [activeRoom]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !user) return;

    const messageData = {
      userId: user.id,
      userName: user.name,
      text: inputText,
      room: activeRoom
    };

    socketRef.current?.emit('send_message', messageData);
    setInputText('');
  };

  const rooms = [
    { id: 'general', name: 'Kênh chung', icon: <Hash size={18} /> },
    { id: 'engineering', name: 'Kỹ thuật', icon: <Hash size={18} /> },
    { id: 'security', name: 'An ninh SOC', icon: <Shield size={18} /> },
  ];

  return (
    <div className="h-[calc(100vh-180px)] flex bg-white rounded-[40px] border border-slate-100 shadow-xl overflow-hidden animate-in fade-in duration-700">
      {/* Sidebar */}
      <div className="w-80 border-r border-slate-100 flex flex-col bg-slate-50/50">
        <div className="p-6 border-b border-slate-100 bg-white">
          <h2 className="text-xl font-black text-slate-800 italic uppercase tracking-tight mb-4">Nexus Chat</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Tìm kiếm hội thoại..." 
              className="w-full bg-slate-100 border-none rounded-xl py-2 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 mb-2">Kênh nội bộ</p>
          {rooms.map(room => (
            <button
              key={room.id}
              onClick={() => setActiveRoom(room.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all ${
                activeRoom === room.id 
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' 
                : 'text-slate-600 hover:bg-white hover:shadow-sm'
              }`}
            >
              {room.icon}
              <span className="text-sm font-bold">{room.name}</span>
            </button>
          ))}
        </div>

        <div className="p-4 bg-white border-t border-slate-100">
          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-100">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600">
              <User size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-slate-800 truncate">{user?.name}</p>
              <p className="text-[10px] text-emerald-500 font-black uppercase tracking-tighter">Trực tuyến</p>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col bg-white">
        {/* Header */}
        <div className="h-20 px-8 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              {rooms.find(r => r.id === activeRoom)?.icon}
            </div>
            <div>
              <h3 className="font-black text-slate-800 text-sm italic">{rooms.find(r => r.id === activeRoom)?.name}</h3>
              <p className="text-[10px] text-slate-400 font-medium">Mã hóa đầu cuối (E2EE) Active</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100">
              <Lock size={12} />
              <span className="text-[10px] font-black uppercase tracking-widest">Bảo mật cao</span>
            </div>
            <button className="p-2 text-slate-400 hover:bg-slate-50 rounded-xl transition-all">
              <MoreVertical size={20} />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-8 space-y-6">
          {messages.map((msg, idx) => {
            const isMe = msg.userId === user?.id;
            return (
              <div key={msg.id || idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[70%] space-y-1 ${isMe ? 'items-end' : 'items-start'}`}>
                  {!isMe && <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">{msg.userName}</p>}
                  <div className={`px-5 py-3 rounded-3xl text-sm font-medium shadow-sm ${
                    isMe 
                    ? 'bg-blue-600 text-white rounded-tr-none' 
                    : 'bg-slate-100 text-slate-800 rounded-tl-none'
                  }`}>
                    {msg.text}
                  </div>
                  <p className={`text-[9px] text-slate-400 font-bold uppercase tracking-tighter ${isMe ? 'text-right mr-2' : 'ml-2'}`}>
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            );
          })}
          <div ref={scrollRef} />
        </div>

        {/* Input */}
        <div className="p-6 border-t border-slate-100">
          <form onSubmit={handleSendMessage} className="relative">
            <input 
              type="text" 
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Nhập tin nhắn bảo mật..." 
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 pl-6 pr-32 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
              <button type="button" className="p-2 text-slate-400 hover:text-blue-600 transition-colors">
                <Paperclip size={20} />
              </button>
              <button type="button" className="p-2 text-slate-400 hover:text-blue-600 transition-colors">
                <Smile size={20} />
              </button>
              <button 
                type="submit"
                disabled={!inputText.trim()}
                className="bg-blue-600 text-white p-2.5 rounded-xl shadow-lg shadow-blue-600/20 hover:bg-blue-700 disabled:opacity-50 disabled:shadow-none transition-all"
              >
                <Send size={18} />
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
