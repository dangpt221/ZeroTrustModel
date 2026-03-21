
import React, { useState, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Shield, Lock, Smartphone, Upload } from 'lucide-react';
import { User as UserType } from '../../types';

interface ProfileFormProps {
  user: UserType;
}

export const ProfileForm: React.FC<ProfileFormProps> = ({ user }) => {
  const { checkSession } = useAuth();
  const [avatarPreview, setAvatarPreview] = useState(user.avatar);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveAvatar = async () => {
    if (!avatarFile) return;
    setSaving(true);
    setMessage(null);
    try {
      const formData = new FormData();
      formData.append('avatar', avatarFile);
      const res = await fetch('/api/users/upload-avatar', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      if (res.ok) {
        await checkSession();
        setMessage({ type: 'success', text: 'Cập nhật ảnh đại diện thành công!' });
        setAvatarFile(null);
      } else {
        setMessage({ type: 'error', text: 'Lỗi khi tải ảnh lên' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Lỗi khi tải ảnh lên' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm space-y-8">
      {message && (
        <div className={`p-3 rounded-xl text-sm font-semibold ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
          {message.text}
        </div>
      )}
      <div className="flex items-center gap-6">
        <div className="relative">
          <img src={avatarPreview} className="w-24 h-24 rounded-3xl object-cover ring-4 ring-emerald-50" />
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/*"
            onChange={handleAvatarChange}
            className="hidden"
          />
          <button
            onClick={() => avatarInputRef.current?.click()}
            className="absolute bottom-0 right-0 w-8 h-8 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full flex items-center justify-center shadow-lg transition-colors"
            title="Đổi ảnh đại diện"
          >
            <Upload size={14} />
          </button>
        </div>
        <div>
          <h3 className="text-xl font-black text-slate-800">{user.name}</h3>
          <p className="text-sm text-slate-400 font-medium">Vai trò: <span className="text-emerald-600 font-bold">{user.role}</span></p>
          {avatarFile && (
            <button
              onClick={handleSaveAvatar}
              disabled={saving}
              className="mt-2 px-4 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl transition-colors disabled:opacity-50"
            >
              {saving ? 'Đang lưu...' : 'Lưu ảnh'}
            </button>
          )}
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
