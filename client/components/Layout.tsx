
import { AnimatePresence, motion } from 'framer-motion';
import {
  ChevronDown,
  LogOut,
  Search,
  Settings,
  Shield,
  User,
  UserCheck
} from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { ADMIN_NAVIGATION, MANAGER_NAVIGATION, STAFF_NAVIGATION } from '../constants';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';
import { NotificationDropdown } from './NotificationDropdown';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [isProfileOpen, setProfileOpen] = useState(false);
  const [clickCount, setClickCount] = useState(0);
  const { user, logout } = useAuth();
  const location = useLocation();

  // Handle double-click on logo to toggle sidebar
  const handleLogoClick = () => {
    const newCount = clickCount + 1;
    setClickCount(newCount);
    if (newCount === 2) {
      setSidebarOpen(!isSidebarOpen);
      setClickCount(0);
    }
    // Reset click count after 300ms
    setTimeout(() => setClickCount(0), 300);
  };

  // Handle nav item click: navigate if different, toggle sidebar if same
  const handleNavItemClick = (e: React.MouseEvent, path: string) => {
    if (location.pathname === path) {
      setSidebarOpen(!isSidebarOpen);
    }
  };

  if (!user) return <>{children}</>;

  const isManager = user?.role === UserRole.MANAGER;
  const isMember = user?.role === UserRole.STAFF;

  let navigation = ADMIN_NAVIGATION;
  if (isManager) navigation = MANAGER_NAVIGATION;
  if (isMember) navigation = STAFF_NAVIGATION;

  // Theme configuration based on role
  let sidebarBg = 'bg-[#0f172a] border-r border-slate-800';
  let sidebarLogoColor = 'bg-blue-600 shadow-blue-500/30';
  let sidebarTextColor = 'text-white';
  let sidebarSubTextColor = 'text-blue-400';

  if (isManager) {
    sidebarBg = 'bg-white border-r border-sky-100';
    sidebarLogoColor = 'bg-sky-500 shadow-sky-500/30';
    sidebarTextColor = 'text-slate-800';
    sidebarSubTextColor = 'text-sky-600';
  } else if (isMember) {
    sidebarBg = 'bg-white border-r border-slate-100';
    sidebarLogoColor = 'bg-emerald-500 shadow-emerald-500/30';
    sidebarTextColor = 'text-slate-800';
    sidebarSubTextColor = 'text-emerald-600';
  }

  const navItemClass = (isActive: boolean) => {
    if (isManager) {
      return isActive
        ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/20'
        : 'text-slate-500 hover:bg-sky-50 hover:text-sky-600';
    }
    if (isMember) {
      return isActive
        ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
        : 'text-slate-500 hover:bg-emerald-50 hover:text-emerald-600';
    }
    return isActive
      ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
      : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200';
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden text-slate-900">
      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: isSidebarOpen ? 288 : 96 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className={`${sidebarBg} flex flex-col z-50 shadow-2xl relative h-full`}
      >
        <div className="p-8 flex items-center gap-3" onClick={handleLogoClick} style={{ cursor: 'pointer' }}>
          <div className={`w-10 h-10 ${sidebarLogoColor} rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg`}>
            {isMember ? <Shield className="text-white" size={24} /> : isManager ? <UserCheck className="text-white" size={24} /> : <Shield className="text-white" size={24} />}
          </div>
          <AnimatePresence>
            {isSidebarOpen && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col overflow-hidden whitespace-nowrap"
              >
                <span className={`font-black text-xl tracking-tighter ${sidebarTextColor}`}>ZERO TRUST</span>
                <span className={`text-[10px] font-bold uppercase tracking-widest ${sidebarSubTextColor}`}>{user?.role} PORTAL</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <nav className="flex-1 mt-6 px-4 space-y-2">
          {navigation.map((item) => {
            const isActive = location.pathname === item.path;
            const isDashboard = item.path === '/dashboard' || item.path === '/';
            return (
              <Link
                key={item.name}
                to={item.path}
                onClick={(e) => handleNavItemClick(e, item.path)}
                className={`flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all group ${navItemClass(isActive)}`}
              >
                <span className={`${isActive ? 'text-white' : 'group-hover:scale-110 transition-transform'}`}>{item.icon}</span>
                <AnimatePresence>
                  {isSidebarOpen && (
                    <motion.span
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      transition={{ duration: 0.2 }}
                      className="font-bold text-sm whitespace-nowrap overflow-hidden"
                    >
                      {item.name}
                    </motion.span>
                  )}
                </AnimatePresence>
              </Link>
            );
          })}
        </nav>

      </motion.aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="h-20 shrink-0 bg-white border-b border-slate-100 flex items-center justify-between px-8 z-40 lg:px-10">
          <div className={`flex items-center bg-slate-100/80 rounded-2xl px-5 py-2.5 w-[450px] max-w-full focus-within:ring-2 transition-all border border-transparent ${isMember ? 'focus-within:ring-emerald-100 focus-within:border-emerald-200' : isManager ? 'focus-within:ring-sky-100 focus-within:border-sky-200' : 'focus-within:ring-blue-100 focus-within:border-blue-200'}`}>
             <Search size={18} className={`mr-3 transition-colors ${isMember ? 'text-emerald-500' : isManager ? 'text-sky-500' : 'text-blue-500'}`} />
             <input
               type="text"
               placeholder="Tìm kiếm tài nguyên bảo mật..."
               className="bg-transparent border-none outline-none text-[15px] w-full font-medium placeholder:text-slate-400 text-slate-700"
             />
             <button className="p-1 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-600 transition-colors hidden sm:block">
                <span className="text-[10px] font-bold border border-slate-300 rounded px-1.5 py-0.5">/</span>
             </button>
          </div>

          {/* Right - Profile & Notifications */}
          <div className="flex-1 flex items-center justify-end gap-6 min-w-0">
            <ChatBadge />
            <NotificationDropdown />

            <div className="h-8 w-px bg-slate-200"></div>

            <div className="relative">
              <button
                onClick={() => setProfileOpen(!isProfileOpen)}
                className="flex items-center gap-3 group hover:bg-slate-50/80 p-1.5 pr-4 rounded-[20px] transition-all border border-transparent hover:border-slate-100"
              >
                <div className="relative">
                  <img
                    src={user?.avatar}
                    alt="avatar"
                    className={`w-10 h-10 rounded-[16px] object-cover transition-transform group-hover:scale-105 shadow-sm`}
                  />
                  <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full"></div>
                </div>
                <div className="text-left hidden lg:block">
                  <p className="text-[14px] font-bold text-slate-800 leading-tight group-hover:text-blue-600 transition-colors">{user?.name}</p>
                  <p className={`text-[11px] font-black uppercase tracking-wider mt-0.5 ${isMember ? 'text-emerald-500' : isManager ? 'text-sky-500' : 'text-blue-500'}`}>{user?.role}</p>
                </div>
                <ChevronDown size={14} className={`text-slate-400 group-hover:text-slate-600 transition-transform duration-300 hidden lg:block ${isProfileOpen ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {isProfileOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    className="absolute right-0 mt-3 w-64 bg-white/90 backdrop-blur-xl border border-slate-100/50 rounded-2xl shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] py-2 z-50"
                  >
                    <div className="px-5 py-3 border-b border-slate-100 mb-2">
                      <p className="text-sm font-bold text-slate-800">{user?.name}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{user?.email || 'user@company.com'}</p>
                    </div>
                    <Link to="/profile" className="flex items-center gap-3 px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:text-blue-600 transition-colors group">
                      <User size={16} className="text-slate-400 group-hover:text-blue-500 transition-colors" /> Hồ sơ của tôi
                    </Link>
                    <Link to="/settings" className="flex items-center gap-3 px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:text-blue-600 transition-colors group">
                      <Settings size={16} className="text-slate-400 group-hover:text-blue-500 transition-colors" /> Cài đặt
                    </Link>
                    <div className="h-px bg-slate-100 my-2 mx-5"></div>
                    <button
                      onClick={logout}
                      className="w-full flex items-center gap-3 px-5 py-2.5 text-sm font-bold text-rose-600 hover:bg-rose-50 transition-colors group"
                    >
                      <LogOut size={16} className="text-rose-400 group-hover:text-rose-600 transition-colors" /> Đăng xuất
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className={`flex-1 bg-[#fbfcfd] flex flex-col ${location.pathname.includes('/messaging') ? 'overflow-hidden' : 'overflow-y-auto p-8 lg:p-10'}`}>
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className={`flex-1 flex flex-col ${location.pathname.includes('/messaging') ? 'min-h-0 overflow-hidden' : ''}`}
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  );
};

// Chat notification badge - direct unread conversations with sender names + preview
const ChatBadge: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [unreadChats, setUnreadChats] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Socket for real-time notifications
  useEffect(() => {
    if (!user) return;

    const socket = io(window.location.origin, {
      transports: ['polling', 'websocket'],
      auth: { userId: user.id, userName: user.name },
      query: { userId: user.id, userName: user.name },
      withCredentials: false
    });

    socket.on('new_admin_message_notification', (data: any) => {
      // Add to unread chats
      setUnreadChats(prev => {
        const existing = prev.find(c => c.userId === data.fromUserId);
        if (existing) {
          return prev.map(c =>
            c.userId === data.fromUserId
              ? { ...c, unreadCount: (c.unreadCount || 0) + 1, lastMessage: { ...c.lastMessage, text: data.preview } }
              : c
          );
        }
        return [{
          userId: data.fromUserId,
          id: data.conversationId,
          name: data.fromUserName,
          role: data.fromUserRole,
          unreadCount: 1,
          lastMessage: { text: data.preview, timestamp: new Date().toISOString() }
        }, ...prev].slice(0, 5);
      });
    });

    return () => { socket.disconnect(); };
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const fetchUnreadConversations = async () => {
      try {
        const res = await fetch('/api/messaging/conversations', {
          credentials: 'include'
        });
        if (!res.ok) throw new Error('Failed to fetch conversations');
        const data = await res.json();
        const chats = data.conversations || [];
        // Filter unread only, dedup by userId, sort recent
        const unread = chats
          .filter((c: any) => c.unreadCount > 0)
          .sort((a: any, b: any) => new Date(b.lastMessage?.timestamp || 0).getTime() - new Date(a.lastMessage?.timestamp || 0).getTime())
          .slice(0, 5);
        setUnreadChats(unread);
      } catch (err) {
        console.error('[ChatBadge] fetchConversations error:', err);
      }
    };

    fetchUnreadConversations();
    const interval = setInterval(fetchUnreadConversations, 5000);
    return () => clearInterval(interval);
  }, [user]);

  // Close dropdown outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleOpenChat = (userId: string) => {
    localStorage.setItem('openDMWithUserId', userId);
    setIsOpen(false);
    window.dispatchEvent(new CustomEvent('open_chat', { detail: { userId } }));
    navigate('/messaging');
  };

  if (unreadChats.length === 0) return null;

  const totalUnread = unreadChats.reduce((sum: number, c: any) => sum + (c.unreadCount || 0), 0);
  const sendersPreview = unreadChats.slice(0, 3).map((c: any) => c.name).join(', ');

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-3 bg-red-50 text-red-500 hover:bg-red-100 rounded-2xl transition-all animate-pulse shadow-lg"
        title={`Tin nhắn mới (${totalUnread}): ${sendersPreview}`}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        </svg>
        <span className="absolute -top-1 -right-1 min-w-[20px] h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
          {totalUnread > 9 ? '9+' : totalUnread}
        </span>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-96 bg-white/95 backdrop-blur-xl border border-slate-100/50 rounded-3xl shadow-2xl z-[100] overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-gradient-to-r from-red-50 to-orange-50">
            <h4 className="font-bold text-slate-800 text-sm">💬 Tin nhắn chưa đọc ({totalUnread})</h4>
            <p className="text-xs text-slate-500 mt-1">Nhấn để mở chat trực tiếp</p>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {unreadChats.map((chat: any) => (
              <button
                key={chat.userId || chat.id}
                onClick={() => handleOpenChat(chat.userId)}
                className="w-full p-4 border-b border-slate-50 last:border-b-0 hover:bg-gradient-to-r hover:from-red-50 hover:to-orange-50 transition-all text-left flex items-start gap-3 group"
              >
                <div className="w-11 h-11 bg-gradient-to-br from-red-100 to-orange-100 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-bold text-slate-900 truncate max-w-[200px]">{chat.name}</p>
                    <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">
                      {chat.unreadCount || 0}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 line-clamp-1 mb-1">
                    {chat.lastMessage?.text?.substring(0, 60) || 'Tin nhắn mới'}…
                  </p>
                  <span className="text-[10px] text-slate-400">
                    {new Date(chat.lastMessage?.timestamp || chat.updatedAt).toLocaleString('vi-VN', {
                      hour: '2-digit', minute: '2-digit'
                    })}
                  </span>
                </div>
                <div className="flex flex-col items-end gap-1 opacity-0 group-hover:opacity-100 transition-all">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400">
                    <polyline points="9 18 15 12 9 6"></polyline>
                  </svg>
                </div>
              </button>
            ))}
            {unreadChats.length === 0 && (
              <div className="p-8 text-center text-slate-400 text-sm py-12">
                Không có tin nhắn mới
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
