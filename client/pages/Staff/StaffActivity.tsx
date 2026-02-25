
import React from 'react';
import { MOCK_AUDIT_LOGS } from '../../mockData';
import { useAuth } from '../../context/AuthContext';
import { ActivityTable } from '../../components/Staff/ActivityTable';
import { History, Download, AlertTriangle, FileText, CheckCircle2 } from 'lucide-react';

export const StaffActivity: React.FC = () => {
  const { user } = useAuth();
  const myLogs = MOCK_AUDIT_LOGS.filter(log => log.userName === user?.name || log.userId === user?.id);

  const handleExport = (format: 'CSV' | 'PDF') => {
    alert(`Nexus SOC: Đang tạo báo cáo hoạt động cá nhân định dạng ${format}. File sẽ được gửi về email ${user?.email} để đảm bảo an toàn.`);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3 uppercase italic">
            <History size={28} className="text-emerald-500" />
            Nhật ký Bảo mật Cá nhân
          </h2>
          <p className="text-slate-500 text-sm font-medium">Theo dõi lịch sử truy cập và các điểm chạm an ninh của bạn</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => handleExport('CSV')}
            className="bg-white border border-slate-200 text-slate-600 px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center gap-2 shadow-sm"
          >
            <Download size={16} /> Export CSV
          </button>
          <button 
            onClick={() => handleExport('PDF')}
            className="bg-slate-900 text-white px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 transition-all flex items-center gap-2 shadow-lg shadow-slate-900/10"
          >
            <FileText size={16} /> Export PDF
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-3">
          <ActivityTable logs={myLogs} />
        </div>

        <div className="space-y-6">
          <div className="bg-emerald-600 p-8 rounded-[40px] text-white shadow-xl relative overflow-hidden">
             <div className="absolute top-0 right-0 p-8 opacity-10">
               <CheckCircle2 size={80} />
             </div>
             <h4 className="font-black text-xs uppercase tracking-widest mb-4">Trạng thái an toàn</h4>
             <p className="text-3xl font-black mb-2 italic">SECURE</p>
             <p className="text-[10px] font-medium opacity-90 leading-relaxed">
               Không có hành vi bất thường nào được ghi nhận trong 7 ngày qua từ thiết bị của bạn.
             </p>
          </div>

          <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm space-y-4">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Thống kê truy cập</h4>
            <div className="flex justify-between items-center py-2 border-b border-slate-50">
              <span className="text-xs font-bold text-slate-600 italic">Mở tài liệu</span>
              <span className="text-sm font-black text-emerald-600">12</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-50">
              <span className="text-xs font-bold text-slate-600 italic">Xác thực 2FA</span>
              <span className="text-sm font-black text-amber-600">4</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-xs font-bold text-slate-600 italic">Lần đăng nhập</span>
              <span className="text-sm font-black text-sky-600">8</span>
            </div>
          </div>

          <div className="bg-amber-900 p-8 rounded-[40px] text-white shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-125 transition-transform">
              <AlertTriangle size={80} />
            </div>
            <div className="relative z-10">
              <p className="text-[11px] text-amber-200 leading-relaxed font-bold uppercase mb-4">Lưu ý bảo mật:</p>
              <p className="text-xs font-medium leading-relaxed italic">
                Nexus SOC liên tục quét các phiên làm việc. Nếu thấy bất kỳ nhật ký nào bạn không thực hiện, hãy khóa tài khoản ngay.
              </p>
              <button className="mt-6 w-full py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all">
                Khóa quyền khẩn cấp
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
