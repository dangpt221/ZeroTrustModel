import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Clock, LogOut, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const PendingApproval: React.FC = () => {
    const { logout, user, checkSession } = useAuth(); // Assuming we add checkSession to context
    const navigate = useNavigate();

    // Tự động chuyển hướng nếu tài khoản đã được kích hoạt
    React.useEffect(() => {
        if (user && user.status !== 'PENDING') {
            navigate('/', { replace: true });
        }
    }, [user, navigate]);

    // Polling để kiểm tra trạng thái phê duyệt từ admin
    React.useEffect(() => {
        const interval = setInterval(() => {
            if (typeof checkSession === 'function') {
                checkSession();
            }
        }, 5000);
        return () => clearInterval(interval);
    }, [checkSession]);

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
            <div className="max-w-md w-full bg-white rounded-[40px] shadow-2xl shadow-indigo-100 p-10 text-center border border-slate-100">
                <div className="w-24 h-24 bg-indigo-50 rounded-3xl flex items-center justify-center mx-auto mb-8 animate-pulse">
                    <Clock className="w-12 h-12 text-indigo-500" />
                </div>

                <h1 className="text-3xl font-black text-slate-800 mb-4 tracking-tight">
                    Chờ xác nhận
                </h1>

                <p className="text-slate-500 font-medium leading-relaxed mb-8">
                    Chào <span className="text-indigo-600 font-bold">{user?.name}</span>, tài khoản của bạn đang được quản lý hệ thống xem xét. Vui lòng quay lại sau khi đã được phê duyệt.
                </p>

                <div className="bg-slate-50 rounded-3xl p-6 mb-8 border border-slate-100 text-left">
                    <div className="flex items-center gap-3 mb-2">
                        <Shield className="w-5 h-5 text-slate-400" />
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest text-shadow-sm">Trạng thái bảo mật</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></div>
                        <span className="text-slate-700 font-bold">Đang chờ phê duyệt</span>
                    </div>
                </div>

                <button
                    onClick={handleLogout}
                    className="w-full py-5 bg-slate-900 hover:bg-black text-white rounded-[24px] font-bold transition-all duration-300 flex items-center justify-center gap-3 shadow-xl shadow-slate-200"
                >
                    <LogOut className="w-5 h-5" />
                    Đăng xuất
                </button>

                <p className="mt-8 text-slate-400 text-sm font-medium">
                    Nexus Zero Trust Security Engine v1.0
                </p>
            </div>
        </div>
    );
};
