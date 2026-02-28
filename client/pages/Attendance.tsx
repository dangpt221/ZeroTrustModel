
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { attendanceApi } from '../api';
import {
  Clock,
  MapPin,
  Smartphone,
  CheckCircle2,
  Calendar,
  ArrowRight,
  ShieldCheck,
  History,
  AlertCircle,
  FileDown,
  LogIn,
  LogOut
} from 'lucide-react';

interface AttendanceEntry {
  id: string;
  userId: string;
  type: 'CHECK_IN' | 'CHECK_OUT';
  timestamp: string;
  location: string;
  device: string;
}

export const Attendance: React.FC = () => {
  const { user } = useAuth();
  const [history, setHistory] = useState<AttendanceEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckOutLoading, setIsCheckOutLoading] = useState(false);

  const fetchHistory = async () => {
    try {
      const data = await attendanceApi.getHistory();
      const list = Array.isArray(data) ? data : [];
      setHistory(list);
    } catch (err) {
      console.error('Fetch history error:', err);
      setHistory([]);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const lastAction = history.length > 0 ? history[0] : null;
  const isCheckedIn = lastAction?.type === 'CHECK_IN';

  const handleCheckIn = async () => {
    setIsLoading(true);
    try {
      const device = typeof navigator !== 'undefined' ? navigator.userAgent : undefined;
      await attendanceApi.checkIn(device ? { device } : undefined);
      await fetchHistory();
      alert('Check-in thành công! Vị trí và thiết bị đã được xác thực bởi Zero Trust Gateway.');
    } catch (err) {
      console.error('Check-in error:', err);
      alert(err instanceof Error ? err.message : 'Chấm công vào thất bại.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckOut = async () => {
    setIsCheckOutLoading(true);
    try {
      const device = typeof navigator !== 'undefined' ? navigator.userAgent : undefined;
      await attendanceApi.checkOut(device ? { device } : undefined);
      await fetchHistory();
      alert('Check-out thành công! Đã ghi nhận kết thúc ca làm.');
    } catch (err) {
      console.error('Check-out error:', err);
      alert(err instanceof Error ? err.message : 'Chấm công ra thất bại.');
    } finally {
      setIsCheckOutLoading(false);
    }
  };

  const handleExportReport = () => {
    const headers = ['Thời gian', 'Loại', 'Vị trí', 'Thiết bị'];
    const rows = history.map((e) => [
      e.timestamp ? new Date(e.timestamp).toLocaleString('vi-VN') : '',
      e.type === 'CHECK_IN' ? 'Vào ca' : 'Tan ca',
      e.location || '-',
      e.device || '-',
    ].join(','));
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `cham-cong-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight italic uppercase">
            Chấm công <span className="text-blue-600">Zero Trust</span>
          </h2>
          <p className="text-slate-500 text-sm mt-1 font-medium">Xác thực danh tính và vị trí làm việc thời gian thực.</p>
        </div>
        <div className="bg-blue-50 px-6 py-3 rounded-2xl border border-blue-100 flex items-center gap-3">
          <ShieldCheck className="text-blue-600" size={24} />
          <div>
            <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Trạng thái xác thực</p>
            <p className="text-sm font-bold text-blue-800">Thiết bị tin cậy: {user?.trustScore ?? 95}%</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Action Card */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-[40px] border border-slate-100 shadow-xl overflow-hidden p-10 text-center space-y-8 relative">
            <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-blue-600 to-indigo-600" />

            <div className="space-y-2">
              <p className="text-5xl font-black text-slate-800 tracking-tighter">
                {new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
              </p>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.3em]">
                {new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
            </div>

            <div className="w-32 h-32 bg-slate-50 rounded-full mx-auto flex items-center justify-center relative">
              <div
                className={`absolute inset-0 rounded-full border-4 border-dashed animate-spin-slow ${
                  isCheckedIn ? 'border-emerald-200' : 'border-blue-200'
                }`}
              />
              <Clock size={48} className={isCheckedIn ? 'text-emerald-500' : 'text-blue-500'} />
            </div>

            <div className="space-y-4">
              <button
                onClick={handleCheckIn}
                disabled={isLoading || isCheckedIn}
                className={`w-full py-5 rounded-3xl font-black text-sm uppercase tracking-widest transition-all shadow-2xl flex items-center justify-center gap-2 ${
                  isCheckedIn
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-600/30 disabled:opacity-50'
                }`}
              >
                <LogIn size={20} />
                {isLoading ? 'Đang xác thực...' : isCheckedIn ? 'Đã Check-in' : 'Bắt đầu làm việc'}
              </button>

              <button
                onClick={handleCheckOut}
                disabled={isCheckOutLoading || !isCheckedIn}
                className={`w-full py-5 rounded-3xl font-black text-sm uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                  !isCheckedIn
                    ? 'bg-slate-50 text-slate-300 cursor-not-allowed'
                    : 'bg-white border-2 border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-rose-200 hover:text-rose-600 disabled:opacity-50'
                }`}
              >
                <LogOut size={20} />
                {isCheckOutLoading ? 'Đang xử lý...' : 'Kết thúc ca làm'}
              </button>
            </div>

            <div className="pt-6 border-t border-slate-50 space-y-4">
              <div className="flex items-center gap-3 text-left">
                <MapPin size={18} className="text-slate-400 shrink-0" />
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Vị trí hiện tại</p>
                  <p className="text-xs font-bold text-slate-700">{lastAction?.location || 'Văn phòng Nexus (Hà Nội)'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-left">
                <Smartphone size={18} className="text-slate-400 shrink-0" />
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Thiết bị</p>
                  <p className="text-xs font-bold text-slate-700 truncate" title={lastAction?.device}>
                    {lastAction?.device || 'Thiết bị đã xác thực'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* History Card */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm p-8">
            <div className="flex justify-between items-center mb-8 px-2">
              <h3 className="font-black text-slate-800 text-xs uppercase tracking-[0.2em] flex items-center gap-2">
                <History size={18} className="text-blue-600" /> Nhật ký chấm công
              </h3>
              <button
                onClick={handleExportReport}
                disabled={history.length === 0}
                className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:underline flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FileDown size={14} /> Xuất báo cáo
              </button>
            </div>

            <div className="space-y-4">
              {history.length > 0 ? (
                history.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center gap-6 p-5 rounded-3xl border border-slate-50 hover:bg-slate-50/50 transition-all group"
                  >
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                        entry.type === 'CHECK_IN' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                      }`}
                    >
                      {entry.type === 'CHECK_IN' ? (
                        <CheckCircle2 size={24} />
                      ) : (
                        <ArrowRight size={24} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start gap-4">
                        <div>
                          <p className="text-sm font-black text-slate-800">
                            {entry.type === 'CHECK_IN' ? 'Bắt đầu làm việc' : 'Kết thúc ca'}
                          </p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5 truncate">
                            {entry.location || '-'} • {entry.device || '-'}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-black text-slate-800">
                            {entry.timestamp
                              ? new Date(entry.timestamp).toLocaleTimeString('vi-VN', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                              : '-'}
                          </p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                            {entry.timestamp ? new Date(entry.timestamp).toLocaleDateString('vi-VN') : '-'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-20 text-center">
                  <Calendar className="mx-auto text-slate-100 mb-4" size={64} />
                  <p className="text-slate-400 font-bold italic">Chưa có dữ liệu chấm công.</p>
                  <p className="text-xs text-slate-400 mt-1">Nhấn &quot;Bắt đầu làm việc&quot; để chấm công vào ca.</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-amber-50 p-8 rounded-[40px] border border-amber-100 flex gap-6 items-start">
            <div className="p-3 bg-amber-100 text-amber-600 rounded-2xl shrink-0">
              <AlertCircle size={24} />
            </div>
            <div>
              <h4 className="font-black text-amber-800 text-sm uppercase tracking-widest mb-2">Lưu ý bảo mật</h4>
              <p className="text-xs text-amber-700 leading-relaxed font-medium">
                Hệ thống Nexus sử dụng <b>Geofencing</b> và <b>Device Fingerprinting</b> để xác thực chấm công. Mọi
                hành vi giả mạo vị trí (Fake GPS) sẽ bị hệ thống SOC tự động khóa tài khoản ngay lập tức.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
