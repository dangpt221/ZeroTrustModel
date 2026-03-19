
import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { ADMIN_NAVIGATION, MANAGER_NAVIGATION, STAFF_NAVIGATION, COLORS } from '../constants';
import { NotificationDropdown } from './NotificationDropdown';
import {
  Bell,
  Search,
  ChevronDown,
  Shield,
  LogOut,
  User,
  Settings,
  Activity,
  UserCheck
} from 'lucide-react';
import { UserRole } from '../types';

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
        <main className={`flex-1 overflow-y-auto bg-[#fbfcfd] flex flex-col ${location.pathname.includes('/messaging') ? '' : 'p-8 lg:p-10'}`}>
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="flex-1 flex flex-col"
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  );
};
