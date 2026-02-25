
import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ADMIN_NAVIGATION, MANAGER_NAVIGATION, MEMBER_NAVIGATION, COLORS } from '../constants';
import { 
  Menu, 
  X, 
  Bell, 
  Search, 
  ChevronDown, 
  Shield, 
  LogOut,
  User,
  Settings,
  HelpCircle,
  Activity,
  UserCheck
} from 'lucide-react';
import { UserRole } from '../types';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [isProfileOpen, setProfileOpen] = useState(false);
  const { user, logout } = useAuth();
  const location = useLocation();

  if (!user) return <>{children}</>;

  const isManager = user.role === UserRole.MANAGER;
  const isMember = user.role === UserRole.MEMBER;
  
  let navigation = ADMIN_NAVIGATION;
  if (isManager) navigation = MANAGER_NAVIGATION;
  if (isMember) navigation = MEMBER_NAVIGATION;
  
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
      <aside 
        className={`${
          isSidebarOpen ? 'w-72' : 'w-24'
        } transition-all duration-500 ease-in-out ${sidebarBg} flex flex-col z-50 shadow-2xl relative`}
      >
        <div className="p-8 flex items-center gap-3">
          <div className={`w-10 h-10 ${sidebarLogoColor} rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg`}>
            {isMember ? <Shield className="text-white" size={24} /> : isManager ? <UserCheck className="text-white" size={24} /> : <Shield className="text-white" size={24} />}
          </div>
          {isSidebarOpen && (
            <div className="flex flex-col animate-in fade-in duration-500">
              <span className={`font-black text-xl tracking-tighter ${sidebarTextColor}`}>ZERO TRUST</span>
              <span className={`text-[10px] font-bold uppercase tracking-widest ${sidebarSubTextColor}`}>{user.role} PORTAL</span>
            </div>
          )}
        </div>

        <nav className="flex-1 mt-6 px-4 space-y-2">
          {navigation.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.name}
                to={item.path}
                className={`flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all group ${navItemClass(isActive)}`}
              >
                <span className={`${isActive ? 'text-white' : 'group-hover:scale-110 transition-transform'}`}>{item.icon}</span>
                {isSidebarOpen && <span className="font-bold text-sm">{item.name}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="p-6">
          {isSidebarOpen && (
            <div className={`p-4 rounded-3xl ${isManager ? 'bg-sky-50 border border-sky-100' : isMember ? 'bg-emerald-50 border border-emerald-100' : 'bg-slate-800/50 border border-slate-700'}`}>
               <p className={`text-[10px] font-bold uppercase mb-2 ${isManager ? 'text-sky-400' : isMember ? 'text-emerald-400' : 'text-slate-500'}`}>Hỗ trợ kỹ thuật</p>
               <button className={`flex items-center gap-2 text-xs font-bold hover:opacity-80 transition-opacity ${isManager ? 'text-sky-700' : isMember ? 'text-emerald-700' : 'text-white'}`}>
                 <HelpCircle size={16} /> Liên hệ SOC
               </button>
            </div>
          )}
          <button 
            onClick={() => setSidebarOpen(!isSidebarOpen)}
            className={`mt-6 w-full flex items-center justify-center p-3 rounded-2xl transition-colors ${
              isManager || isMember ? 'bg-slate-100 hover:bg-slate-200 text-slate-500' : 'bg-slate-800 hover:bg-slate-700 text-slate-400'
            }`}
          >
            {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="h-20 bg-white border-b border-slate-100 flex items-center justify-between px-10 z-40">
          <div className={`flex items-center bg-slate-100/80 rounded-2xl px-5 py-2.5 w-[450px] max-w-full focus-within:ring-2 transition-all border border-transparent ${isMember ? 'focus-within:ring-emerald-100 focus-within:border-emerald-200' : 'focus-within:ring-sky-100 focus-within:border-sky-200'}`}>
            <Search size={18} className="text-slate-400 mr-3" />
            <input 
              type="text" 
              placeholder="Tìm kiếm tài nguyên bảo mật..." 
              className="bg-transparent border-none outline-none text-sm w-full font-medium"
            />
          </div>

          <div className="flex items-center gap-8">
            <div className="flex items-center gap-4">
              <button className={`relative p-3 bg-slate-50 text-slate-400 hover:bg-slate-100 rounded-2xl transition-all ${isMember ? 'hover:text-emerald-600' : 'hover:text-sky-600'}`}>
                <Bell size={20} />
                <span className="absolute top-3 right-3 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white"></span>
              </button>
            </div>

            <div className="h-10 w-px bg-slate-100"></div>

            <div className="relative">
              <button 
                onClick={() => setProfileOpen(!isProfileOpen)}
                className="flex items-center gap-4 group hover:bg-slate-50 p-2 rounded-2xl transition-all"
              >
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-bold text-slate-900 leading-tight">{user.name}</p>
                  <p className={`text-[10px] font-black uppercase tracking-widest mt-0.5 ${isMember ? 'text-emerald-600' : isManager ? 'text-sky-600' : 'text-blue-600'}`}>{user.role}</p>
                </div>
                <div className="relative">
                  <img 
                    src={user.avatar} 
                    alt="avatar" 
                    className={`w-11 h-11 rounded-2xl ring-4 object-cover ${isMember ? 'ring-emerald-50' : isManager ? 'ring-sky-50' : 'ring-slate-100'}`}
                  />
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full"></div>
                </div>
                <ChevronDown size={16} className={`text-slate-400 transition-transform duration-300 ${isProfileOpen ? 'rotate-180' : ''}`} />
              </button>

              {isProfileOpen && (
                <div className="absolute right-0 mt-4 w-60 bg-white border border-slate-100 rounded-3xl shadow-2xl py-3 z-50 animate-in fade-in slide-in-from-top-4 duration-300">
                  <Link to="/profile" className="flex items-center gap-3 px-5 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
                    <User size={18} /> Hồ sơ của tôi
                  </Link>
                  <button 
                    onClick={logout}
                    className="w-full flex items-center gap-3 px-5 py-3 text-sm font-bold text-rose-600 hover:bg-rose-50 transition-colors"
                  >
                    <LogOut size={18} /> Đăng xuất
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-10 bg-[#fbfcfd]">
          <div className={`mb-8 p-4 bg-gradient-to-r ${isMember ? 'from-emerald-500/10' : isManager ? 'from-sky-500/10' : 'from-blue-600/5'} to-transparent border-l-4 ${isMember ? 'border-emerald-500' : isManager ? 'border-sky-500' : 'border-blue-600'} rounded-r-2xl flex items-center justify-between`}>
            <div className="flex items-center gap-3">
              <Activity className={isMember ? 'text-emerald-600' : isManager ? 'text-sky-600' : 'text-blue-600'} size={18} />
              <p className="text-sm font-bold text-slate-700">Bộ phận: {user.department} | Phiên làm việc bảo mật (Trust Score: {user.trustScore}%)</p>
            </div>
          </div>
          {children}
        </main>
      </div>
    </div>
  );
};
