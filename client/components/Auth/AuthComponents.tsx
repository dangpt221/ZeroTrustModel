
import React from 'react';
import { AlertCircle, ArrowRight } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
}

export const LoginButton: React.FC<ButtonProps> = ({ children, loading, ...props }) => (
  <button
    {...props}
    className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed"
  >
    {loading ? 'Đang xử lý...' : children}
    {!loading && <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />}
  </button>
);

export const OAuthGoogleButton: React.FC = () => (
  <button
    type="button"
    onClick={() => window.location.href = '/api/auth/google'}
    className="w-full bg-white/5 border border-white/10 text-slate-300 font-semibold py-3 rounded-xl hover:bg-white/10 transition-all flex items-center justify-center gap-3 shadow-sm"
  >
    <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
    Đăng nhập bằng tài khoản Google
  </button>
);

export const AuthErrorMessage: React.FC<{ message: string }> = ({ message }) => (
  <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 px-4 py-3 rounded-xl text-xs font-bold flex items-center gap-2 animate-in fade-in zoom-in-95 duration-200">
    <AlertCircle size={14} /> {message}
  </div>
);
