
import React from 'react';
import { User, Shield, Lock, Smartphone } from 'lucide-react';
import { User as UserType } from '../../types';

interface ProfileFormProps {
  user: UserType;
}

export const ProfileForm: React.FC<ProfileFormProps> = ({ user }) => {
  return (
    <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm space-y-8">
      <div className="flex items-center gap-6">
        <div className="relative">
          <img src={user.avatar} className="w-24 h-24 rounded-3xl object-cover ring-4 ring-emerald-50" />
          <button className="absolute -bottom-2 -right-2 p-2 bg-emerald-500 text-white rounded-xl shadow-lg border-2 border-white">
            <EditIcon size={16} />
          </button>
        </div>
        <div>
          <h3 className="text-xl font-black text-slate-800">{user.name}</h3>
          <p className="text-sm text-slate-400 font-medium">Vai trò: <span className="text-emerald-600 font-bold">{user.role}</span></p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email nội bộ</label>
          <input 
            type="text" 
            value={user.email} 
            readOnly
            className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-semibold text-slate-500 cursor-not-allowed"
          />
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Bộ phận</label>
          <input 
            type="text" 
            value={user.department} 
            readOnly
            className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-semibold text-slate-500 cursor-not-allowed"
          />
        </div>
      </div>

      <div className="pt-6 border-t border-slate-50 space-y-4">
        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
          <Lock size={14} className="text-emerald-500" /> Bảo mật & Xác thực
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 hover:border-emerald-200 hover:bg-emerald-50/30 transition-all text-left group">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-100 rounded-lg group-hover:bg-emerald-100 group-hover:text-emerald-600">
                <Shield size={18} />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-700">Xác thực 2FA</p>
                <p className="text-[10px] text-slate-400">Trạng thái: {user.mfaEnabled ? 'Đã bật' : 'Chưa bật'}</p>
              </div>
            </div>
          </button>
          <button className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 hover:border-emerald-200 hover:bg-emerald-50/30 transition-all text-left group">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-100 rounded-lg group-hover:bg-emerald-100 group-hover:text-emerald-600">
                <Smartphone size={18} />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-700">Thay đổi mật khẩu</p>
                <p className="text-[10px] text-slate-400">Lần cuối: 3 tháng trước</p>
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

const EditIcon = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
);
