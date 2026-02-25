
import React from 'react';
import { Bell, Search, Shield, ChevronDown, LogOut, User as UserIcon, Activity } from 'lucide-react';
import { User } from '../../types';

interface StaffTopBarProps {
  user: User;
  onLogout: () => void;
  onProfileClick: () => void;
}

export const StaffTopBar: React.FC<StaffTopBarProps> = ({ user, onLogout, onProfileClick }) => {
  return (
    <header className="h-20 bg-white border-b border-slate-100 flex items-center justify-between px-8 z-40 sticky top-0">
      <div className="flex items-center bg-slate-50 rounded-2xl px-5 py-2.5 w-[400px] border border-slate-100 focus-within:ring-2 focus-within:ring-emerald-500/10 focus-within:border-emerald-500 transition-all">
        <Search size={18} className="text-slate-400 mr-3" />
        <input 
          type="text" 
          placeholder="Tìm kiếm tài liệu bảo mật..." 
          className="bg-transparent border-none outline-none text-sm w-full font-medium"
        />
      </div>

      <div className="flex items-center gap-6">
        <div className="flex items-center gap-3 bg-emerald-50 px-4 py-2 rounded-xl border border-emerald-100">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
          <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700 flex items-center gap-1.5">
            <Shield size={12} /> Đã xác thực JIT
          </span>
        </div>

        <button className="relative p-2.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all">
          <Bell size={20} />
          <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border-2 border-white"></span>
        </button>

        <div className="h-8 w-px bg-slate-100"></div>

        <div className="relative group">
          <button 
            onClick={onProfileClick}
            className="flex items-center gap-3 hover:bg-slate-50 p-1.5 rounded-2xl transition-all"
          >
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold text-slate-900 leading-tight">{user.name}</p>
              <p className="text-[10px] font-black uppercase text-emerald-600 tracking-wider">Member ID: {user.id}</p>
            </div>
            <img 
              src={user.avatar} 
              className="w-10 h-10 rounded-xl ring-2 ring-emerald-50 object-cover"
              alt="Avatar"
            />
            <ChevronDown size={14} className="text-slate-400 group-hover:text-emerald-600 transition-colors" />
          </button>
        </div>
      </div>
    </header>
  );
};
