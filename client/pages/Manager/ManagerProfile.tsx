
import React, { useState, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { usersApi } from '../../api';
import { ShieldCheck, Smartphone, Save, UserCircle, Upload } from 'lucide-react';

export const ManagerProfile: React.FC = () => {
  const { user, checkSession } = useAuth();

  const [name, setName] = useState(user?.name || '');
  const [avatar, setAvatar] = useState(user?.avatar || '');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>(user?.avatar || '');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  if (!user) return null;

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

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      let finalAvatar = avatar;
      if (avatarFile) {
        const formData = new FormData();
        formData.append('avatar', avatarFile);
        const res = await fetch('/api/users/upload-avatar', {
          method: 'POST',
          credentials: 'include',
          body: formData,
        });
        if (res.ok) {
          const data = await res.json();
          finalAvatar = data.url;
          setAvatar(finalAvatar);
        }
      }
      await usersApi.updateProfile({ name, avatar: finalAvatar });
      await checkSession();
      setAvatarFile(null);
      setMessage({ type: 'success', text: 'Cập nhật hồ sơ thành công!' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Lỗi khi cập nhật hồ sơ' });
    } finally {
      setSaving(false);
    }
  };

  const trustColor = user.trustScore >= 80 ? 'emerald' : user.trustScore >= 50 ? 'amber' : 'red';
  const trustBg = trustColor === 'emerald' ? 'bg-emerald-50 border-emerald-100' : trustColor === 'amber' ? 'bg-amber-50 border-amber-100' : 'bg-red-50 border-red-100';
  const trustText = trustColor === 'emerald' ? 'text-emerald-600' : trustColor === 'amber' ? 'text-amber-600' : 'text-red-600';
  const trustBar = trustColor === 'emerald' ? 'bg-emerald-500' : trustColor === 'amber' ? 'bg-amber-500' : 'bg-red-500';

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight uppercase italic flex items-center gap-3">
            <ShieldCheck size={28} className="text-emerald-500" />
            Hồ sơ & Bảo mật
          </h2>
          <p className="text-slate-500 text-sm font-medium">Quản lý thông tin cá nhân và cài đặt bảo mật tài khoản</p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-xs font-bold px-3 py-1.5 rounded-xl border ${trustBg} ${trustText}`}>
            Trust Score: {user.trustScore}%
          </span>
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-2xl text-sm font-semibold ${
          message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Left: Profile Form + Password */}
        <div className="lg:col-span-2 space-y-8">

          {/* Profile Info */}
          <form onSubmit={handleSaveProfile} className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm space-y-6">
            <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
              <UserCircle size={20} className="text-blue-500" />
              Thông tin cá nhân
            </h3>

            <div className="flex items-center gap-6">
              <div className="relative">
                <img src={avatarPreview || avatar} className="w-24 h-24 rounded-3xl object-cover ring-4 ring-blue-50" />
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  className="absolute bottom-0 right-0 w-8 h-8 bg-blue-500 hover:bg-blue-600 text-white rounded-full flex items-center justify-center shadow-lg transition-colors"
                  title="Đổi ảnh đại diện"
                >
                  <Upload size={14} />
                </button>
              </div>
              <div className="flex-1 space-y-3">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tên hiển thị</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Avatar URL</label>
                  <input
                    type="text"
                    value={avatar}
                    onChange={(e) => setAvatar(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email</label>
                <input
                  type="text"
                  value={user.email}
                  readOnly
                  className="w-full bg-slate-100 border-none rounded-2xl p-4 text-sm font-semibold text-slate-500 cursor-not-allowed"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Vai trò</label>
                <input
                  type="text"
                  value={user.role}
                  readOnly
                  className="w-full bg-slate-100 border-none rounded-2xl p-4 text-sm font-semibold text-slate-500 cursor-not-allowed"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Phòng ban</label>
                <input
                  type="text"
                  value={user.department}
                  readOnly
                  className="w-full bg-slate-100 border-none rounded-2xl p-4 text-sm font-semibold text-slate-500 cursor-not-allowed"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Trạng thái</label>
                <input
                  type="text"
                  value={user.status}
                  readOnly
                  className="w-full bg-slate-100 border-none rounded-2xl p-4 text-sm font-semibold text-slate-500 cursor-not-allowed"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-slate-300 text-white font-bold rounded-2xl transition-colors flex items-center justify-center gap-2"
            >
              <Save size={16} />
              {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
            </button>
          </form>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-8">

          {/* Trust Score Card */}
          <div className={`p-8 rounded-[40px] text-white shadow-xl border-2 ${
            trustColor === 'emerald' ? 'bg-emerald-600 border-emerald-700' :
            trustColor === 'amber' ? 'bg-amber-600 border-amber-700' :
            'bg-red-600 border-red-700'
          }`}>
            <h4 className="font-black text-xs uppercase tracking-[0.2em] mb-4 opacity-80">Trust Score</h4>
            <div className="flex items-end gap-3 mb-6">
              <span className="text-5xl font-black leading-none">{user.trustScore}%</span>
              <span className="text-[10px] font-bold uppercase tracking-widest pb-1 opacity-80">Verified</span>
            </div>
            <div className="w-full bg-white/20 h-2 rounded-full overflow-hidden">
              <div className={`${trustBar} h-full`} style={{ width: `${user.trustScore}%` }}></div>
            </div>
            <p className="text-[10px] mt-6 leading-relaxed font-medium opacity-90 italic">
              {user.trustScore >= 80
                ? 'Trust Score của bạn rất cao. Tài khoản được xác thực đầy đủ.'
                : user.trustScore >= 50
                ? 'Trust Score của bạn ở mức trung bình. Hãy bật MFA để tăng điểm.'
                : 'Trust Score thấp. Vui lòng xác thực thiết bị và bật MFA.'
              }
            </p>
          </div>

          {/* Security Status */}
          <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm space-y-4">
            <h4 className="font-bold text-slate-800 flex items-center gap-2">
              <ShieldCheck size={18} className="text-emerald-500" />
              Trạng thái bảo mật
            </h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600 font-medium">Xác thực 2 yếu tố</span>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-xl ${user.mfaEnabled ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                  {user.mfaEnabled ? 'Bật' : 'Tắt'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600 font-medium">Thiết bị đã đăng ký</span>
                <span className="text-xs font-bold px-2.5 py-1 rounded-xl bg-blue-100 text-blue-700">
                  {user.knownDevices?.length || 0} thiết bị
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600 font-medium">Tài khoản</span>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-xl ${user.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                  {user.status}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600 font-medium">Khóa tài khoản</span>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-xl ${user.isLocked ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                  {user.isLocked ? 'Bị khóa' : 'Bình thường'}
                </span>
              </div>
            </div>
          </div>

          {/* Known Devices */}
          <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm space-y-4">
            <h4 className="font-bold text-slate-800 flex items-center gap-2">
              <Smartphone size={18} className="text-blue-500" />
              Thiết bị đã biết
            </h4>
            {(user.knownDevices || []).length === 0 ? (
              <p className="text-sm text-slate-400 italic">Chưa có thiết bị nào được đăng ký</p>
            ) : (
              <div className="space-y-3">
                {(user.knownDevices || []).map((device: any, idx: number) => (
                  <div key={idx} className="p-3 bg-slate-50 rounded-xl">
                    <p className="text-xs font-semibold text-slate-700">{device.name || 'Thiết bị không xác định'}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{device.browser} • {device.os}</p>
                    <p className="text-[10px] text-slate-400">{device.lastUsed ? new Date(device.lastUsed).toLocaleDateString('vi-VN') : 'Không rõ'}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

