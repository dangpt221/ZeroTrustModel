
import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Shield, Lock, Mail, Smartphone, CheckCircle2 } from 'lucide-react';
import { 
  LoginButton, 
  OAuthGoogleButton, 
  AuthErrorMessage 
} from '../components/Auth/AuthComponents';

export const Login: React.FC = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    mfaCode: '',
    rememberMe: false
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login, needsMFA, tempUser, isAuthenticated } = useAuth();

  // Nếu đã đăng nhập thành công, chuyển hướng ngay về Dashboard
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    const val = type === 'checkbox' ? checked : value;
    setFormData(prev => ({ ...prev, [name]: val }));
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (needsMFA) {
        const success = await login(tempUser!.email, undefined, formData.mfaCode);
        if (!success) setError('Mã xác thực không hợp lệ. Vui lòng thử lại.');
      } else {
        const success = await login(formData.email, formData.password);
        if (!success) {
          setError('Thông tin đăng nhập không chính xác hoặc email không tồn tại trong hệ thống.');
        }
      }
    } catch (err) {
      setError('Đã có lỗi hệ thống xảy ra. Vui lòng thử lại sau.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f172a] px-4 relative overflow-hidden font-sans">
      {/* Background Orbs */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-blue-600/10 blur-[150px] rounded-full animate-pulse"></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-indigo-600/10 blur-[150px] rounded-full animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      <div className="w-full max-w-md z-10 space-y-8">
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl flex items-center justify-center shadow-2xl shadow-blue-500/40 transform -rotate-3 hover:rotate-0 transition-transform duration-500">
            <Shield className="text-white" size={40} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-white tracking-tighter uppercase italic">Nexus Zero Trust</h1>
            <p className="text-slate-400 font-medium text-sm">Hệ thống quản lý định danh & truy cập bảo mật</p>
          </div>
        </div>

        <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-10 rounded-[40px] shadow-2xl relative overflow-hidden">
          {/* Internal gradient line */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-50"></div>

          <h2 className="text-xl font-bold text-white mb-8 text-center">
            {needsMFA ? 'Xác thực hai lớp' : 'Đăng nhập hệ thống'}
          </h2>

          <form onSubmit={handleAuth} className="space-y-6">
            {error && <AuthErrorMessage message={error} />}

            {!needsMFA ? (
              <div className="space-y-5">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Email nội bộ</label>
                  <div className="relative group">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors" size={18} />
                    <input 
                      name="email"
                      type="email"
                      required
                      value={formData.email}
                      onChange={handleInputChange}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-600 font-medium"
                      placeholder="admin@nexus.com hoặc member@nexus.com"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center ml-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Mật khẩu</label>
                    <a href="#" className="text-[10px] font-bold text-blue-500 hover:text-blue-400 uppercase">Quên mật khẩu?</a>
                  </div>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors" size={18} />
                    <input 
                      name="password"
                      type="password"
                      required
                      value={formData.password}
                      onChange={handleInputChange}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-600 font-medium"
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between py-2">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <div className="relative">
                      <input 
                        name="rememberMe"
                        type="checkbox"
                        checked={formData.rememberMe}
                        onChange={handleInputChange}
                        className="peer sr-only"
                      />
                      <div className="w-5 h-5 border-2 border-white/20 rounded-lg peer-checked:bg-blue-600 peer-checked:border-blue-600 transition-all flex items-center justify-center">
                        <CheckCircle2 size={12} className="text-white opacity-0 peer-checked:opacity-100" />
                      </div>
                    </div>
                    <span className="text-xs font-bold text-slate-400 group-hover:text-slate-300 transition-colors">Duy trì đăng nhập</span>
                  </label>
                </div>
              </div>
            ) : (
              <div className="space-y-6 text-center animate-in zoom-in-95 duration-300">
                <div className="w-20 h-20 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto text-blue-400 shadow-inner">
                  <Smartphone size={40} className="animate-bounce" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-bold text-white">Nhập mã OTP</h3>
                  <p className="text-xs text-slate-400 px-6">Mã 6 chữ số từ ứng dụng Google Authenticator. Nhập mã bất kỳ (vd: 000000) để tiếp tục.</p>
                </div>
                <div className="relative max-w-[240px] mx-auto">
                  <input 
                    name="mfaCode"
                    type="text"
                    maxLength={6}
                    value={formData.mfaCode}
                    onChange={(e) => setFormData(prev => ({ ...prev, mfaCode: e.target.value.replace(/\D/g, '') }))}
                    className="w-full bg-white/5 border-2 border-white/10 rounded-2xl py-5 text-center text-3xl tracking-[0.4em] font-mono font-black text-white focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                    placeholder="000000"
                    autoFocus
                  />
                </div>
              </div>
            )}

            <div className="pt-4">
              <LoginButton loading={isLoading} type="submit">
                {!needsMFA ? 'Đăng nhập hệ thống' : 'Xác minh OTP'}
              </LoginButton>
            </div>
          </form>

          {!needsMFA && (
            <div className="mt-8 space-y-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/10"></div>
                </div>
                <div className="relative flex justify-center text-xs uppercase font-black tracking-widest">
                  <span className="bg-[#1e293b] px-4 text-slate-500">Hoặc tiếp tục với</span>
                </div>
              </div>

              <OAuthGoogleButton onClick={() => alert('Chức năng Google Auth đang được tích hợp cho tài khoản doanh nghiệp...')} />
            </div>
          )}
        </div>

        <div className="text-center space-y-4">
          <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.3em] flex items-center justify-center gap-2">
            <Shield size={12} className="text-blue-500" /> Hệ thống bảo mật đa lớp Active
          </p>
          <div className="p-4 rounded-2xl bg-white/5 border border-white/5 inline-block">
            <p className="text-[10px] text-slate-500 italic leading-relaxed">
              Tài khoản: admin@nexus.com (có MFA) hoặc member@nexus.com (không MFA)<br/>
              Mật khẩu: bất kỳ. OTP: bất kỳ 6 số.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
