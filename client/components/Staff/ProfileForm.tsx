
import React, { useState, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Shield, Lock, Smartphone, Upload, CheckCircle2, KeyRound, Eye, EyeOff } from 'lucide-react';
import { User as UserType } from '../../types';
import { usersApi } from '../../api';

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

  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showPassword, setShowPassword] = useState({ current: false, new: false, confirm: false });
  const [passwordForm, setPasswordForm] = useState({ current: '', new: '', confirm: '' });
  const [passSaving, setPassSaving] = useState(false);
  const [mfaSaving, setMfaSaving] = useState(false);

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

  const handlePasswordChange = async () => {
    const isNewSetup = user.hasPasswordSet === false;

    if ((!isNewSetup && !passwordForm.current) || !passwordForm.new || !passwordForm.confirm) {
      setMessage({ type: 'error', text: 'Vui lòng điền đầy đủ thông tin mật khẩu' });
      return;
    }
    if (passwordForm.new !== passwordForm.confirm) {
      setMessage({ type: 'error', text: 'Mật khẩu xác nhận không khớp' });
      return;
    }
    if (passwordForm.new.length < 6) {
      setMessage({ type: 'error', text: 'Mật khẩu mới phải có ít nhất 6 ký tự' });
      return;
    }
    
    setPassSaving(true);
    setMessage(null);
    try {
      await usersApi.changePassword({ currentPassword: passwordForm.current, newPassword: passwordForm.new });
      setMessage({ type: 'success', text: 'Tài khoản của bạn đã được đổi mật khẩu an toàn!' });
      setIsChangingPassword(false);
      setPasswordForm({ current: '', new: '', confirm: '' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Lỗi khi thay đổi mật khẩu' });
    } finally {
      setPassSaving(false);
    }
  };

  const handleToggleMFA = async () => {
    const currentMfa = user.mfaEnabled;
    const actionText = currentMfa ? 'Tắt' : 'Bật';
    if (!confirm(`Bạn có chắc chắn muốn ${actionText} tính năng Xác thực 2 bước bằng Email?`)) {
      return;
    }
    setMfaSaving(true);
    setMessage(null);
    try {
      await usersApi.updateProfile({ mfaEnabled: !currentMfa });
      await checkSession();
      setMessage({ type: 'success', text: `Đã ${actionText.toLowerCase()} xác thực 2 bước thành công!` });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || `Lỗi khi ${actionText.toLowerCase()} xác thực 2 bước` });
    } finally {
      setMfaSaving(false);
    }
  };

  return (
    <div className="bg-white p-4 md:p-8 rounded-[32px] border border-slate-100 shadow-sm space-y-8">
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

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button 
            onClick={handleToggleMFA}
            disabled={mfaSaving}
            className={`flex items-center justify-between p-4 rounded-2xl border transition-all text-left group ${user.mfaEnabled ? 'border-emerald-300 bg-emerald-50' : 'border-slate-100 hover:border-emerald-200 hover:bg-emerald-50/30'} disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg transition-colors ${user.mfaEnabled ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20' : 'bg-slate-100 group-hover:bg-emerald-100 group-hover:text-emerald-600'}`}>
                <Shield size={18} />
              </div>
              <div>
                <p className={`text-xs font-bold ${user.mfaEnabled ? 'text-emerald-800' : 'text-slate-700'}`}>Xác thực 2FA (Email)</p>
                <p className={`text-[10px] ${user.mfaEnabled ? 'text-emerald-600' : 'text-slate-400'}`}>
                  {mfaSaving ? 'Đang cập nhật...' : (user.mfaEnabled ? 'Đang bảo vệ (Đã Bật)' : 'Trạng thái: Chưa bật')}
                </p>
              </div>
            </div>
            {user.mfaEnabled && <CheckCircle2 size={18} className="text-emerald-500" />}
          </button>
          <button 
            onClick={() => setIsChangingPassword(!isChangingPassword)}
            className={`flex items-center justify-between p-4 rounded-2xl border transition-all text-left group ${isChangingPassword ? 'border-emerald-300 bg-emerald-50/50 shadow-sm' : 'border-slate-100 hover:border-emerald-200 hover:bg-emerald-50/30'}`}
          >
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg transition-colors ${isChangingPassword ? 'bg-emerald-200 text-emerald-700' : 'bg-slate-100 group-hover:bg-emerald-100 group-hover:text-emerald-600'}`}>
                <KeyRound size={18} />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-700">Thay đổi mật khẩu</p>
                <p className="text-[10px] text-slate-400">Bảo mật tài khoản của bạn</p>
              </div>
            </div>
          </button>
        </div>

        {/* Change Password Form Expansion */}
        <div className={`transition-all duration-500 origin-top overflow-hidden ${isChangingPassword ? 'max-h-[500px] opacity-100 mt-6' : 'max-h-0 opacity-0'}`}>
          <div className="p-4 md:p-6 bg-slate-50 border border-slate-100 rounded-[24px] space-y-4">
            <h5 className="font-bold text-slate-700 mb-4 text-sm">{user.hasPasswordSet === false ? 'Tạo Mật khẩu mới (Tài khoản Google)' : 'Thiết lập Mật khẩu Mới'}</h5>
            
            <div className="space-y-4">
              {user.hasPasswordSet !== false && (
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-widest font-bold text-slate-500 pl-1">Mật khẩu hiện tại</label>
                  <div className="relative">
                    <input
                      type={showPassword.current ? "text" : "password"}
                      value={passwordForm.current}
                      onChange={(e) => setPasswordForm({...passwordForm, current: e.target.value})}
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                      placeholder="••••••••"
                    />
                    <button onClick={() => setShowPassword({...showPassword, current: !showPassword.current})} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      {showPassword.current ? <EyeOff size={16}/> : <Eye size={16}/>}
                    </button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-widest font-bold text-slate-500 pl-1">Mật khẩu mới</label>
                  <div className="relative">
                    <input
                      type={showPassword.new ? "text" : "password"}
                      value={passwordForm.new}
                      onChange={(e) => setPasswordForm({...passwordForm, new: e.target.value})}
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                      placeholder="Ít nhất 6 ký tự"
                    />
                    <button onClick={() => setShowPassword({...showPassword, new: !showPassword.new})} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      {showPassword.new ? <EyeOff size={16}/> : <Eye size={16}/>}
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-widest font-bold text-slate-500 pl-1">Xác nhận mật khẩu</label>
                  <div className="relative">
                    <input
                      type={showPassword.confirm ? "text" : "password"}
                      value={passwordForm.confirm}
                      onChange={(e) => setPasswordForm({...passwordForm, confirm: e.target.value})}
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                      placeholder="Nhập lại mật khẩu mới"
                    />
                    <button onClick={() => setShowPassword({...showPassword, confirm: !showPassword.confirm})} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      {showPassword.confirm ? <EyeOff size={16}/> : <Eye size={16}/>}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-3">
              <button 
                onClick={() => {
                  setIsChangingPassword(false);
                  setPasswordForm({ current: '', new: '', confirm: '' });
                  setMessage(null);
                }}
                className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-200 bg-slate-100 rounded-xl transition-all"
              >
                Hủy
              </button>
              <button 
                onClick={handlePasswordChange}
                disabled={passSaving}
                className="px-6 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-emerald-500/20 disabled:opacity-50 flex items-center gap-2"
              >
                {passSaving ? 'Đang lưu...' : <><CheckCircle2 size={16}/> Lưu mật khẩu</>}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
