
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Clock, 
  MapPin, 
  Smartphone, 
  CheckCircle2, 
  Calendar, 
  ArrowRight, 
  ShieldCheck,
  History,
  AlertCircle
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
  const [lastAction, setLastAction] = useState<AttendanceEntry | null>(null);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const res = await fetch('/api/attendance/history');
      if (res.ok) {
        const data = await res.json();
        setHistory(data.reverse());
        if (data.length > 0) setLastAction(data[0]);
      }
    } catch (err) {
      console.error('Fetch history error:', err);
    }
  };

  const handleCheckIn = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/attendance/check-in', { method: 'POST' });
      if (res.ok) {
        await fetchHistory();
        alert('Check-in thành công! Vị trí và thiết bị đã được xác thực bởi Zero Trust Gateway.');
      }
    } catch (err) {
      console.error('Check-in error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const isCheckedIn = lastAction?.type === 'CHECK_IN';

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
            <p className="text-sm font-bold text-blue-800">Thiết bị tin cậy: {user?.trustScore}%</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Action Card */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-[40px] border border-slate-100 shadow-xl overflow-hidden p-10 text-center space-y-8 relative">
            <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-blue-600 to-indigo-600"></div>
            
            <div className="space-y-2">
              <p className="text-5xl font-black text-slate-800 tracking-tighter">
                {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.3em]">
                {new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
            </div>

            <div className="w-32 h-32 bg-slate-50 rounded-full mx-auto flex items-center justify-center relative">
              <div className={`absolute inset-0 rounded-full border-4 border-dashed animate-spin-slow ${isCheckedIn ? 'border-emerald-200' : 'border-blue-200'}`}></div>
              <Clock size={48} className={isCheckedIn ? 'text-emerald-500' : 'text-blue-500'} />
            </div>

            <div className="space-y-4">
              <button
                onClick={handleCheckIn}
                disabled={isLoading}
                className={`w-full py-5 rounded-3xl font-black text-sm uppercase tracking-widest transition-all shadow-2xl ${
                  isCheckedIn 
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                  : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-600/30'
                }`}
              >
                {isLoading ? 'Đang xác thực...' : isCheckedIn ? 'Đã Check-in' : 'Bắt đầu làm việc'}
              </button>
              
              <button
                className={`w-full py-5 rounded-3xl font-black text-sm uppercase tracking-widest transition-all ${
                  !isCheckedIn 
                  ? 'bg-slate-50 text-slate-300 cursor-not-allowed' 
                  : 'bg-white border-2 border-slate-100 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Kết thúc ca làm
              </button>
            </div>

            <div className="pt-6 border-t border-slate-50 space-y-4">
              <div className="flex items-center gap-3 text-left">
                <MapPin size={18} className="text-slate-400" />
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Vị trí hiện tại</p>
                  <p className="text-xs font-bold text-slate-700">Văn phòng Nexus (Hà Nội)</p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-left">
                <Smartphone size={18} className="text-slate-400" />
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Thiết bị</p>
                  <p className="text-xs font-bold text-slate-700">MacBook Pro (Authorized)</p>
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
              <button className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:underline">Xuất báo cáo</button>
            </div>

            <div className="space-y-4">
              {history.length > 0 ? history.map((entry) => (
                <div key={entry.id} className="flex items-center gap-6 p-5 rounded-3xl border border-slate-50 hover:bg-slate-50/50 transition-all group">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                    entry.type === 'CHECK_IN' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                  }`}>
                    {entry.type === 'CHECK_IN' ? <CheckCircle2 size={24} /> : <ArrowRight size={24} />}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm font-black text-slate-800">{entry.type === 'CHECK_IN' ? 'Bắt đầu làm việc' : 'Kết thúc ca'}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{entry.location} • {entry.device}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-black text-slate-800">{new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{new Date(entry.timestamp).toLocaleDateString('vi-VN')}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )) : (
                <div className="py-20 text-center">
                  <Calendar className="mx-auto text-slate-100 mb-4" size={64} />
                  <p className="text-slate-400 font-bold italic">Chưa có dữ liệu chấm công trong tháng này.</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-amber-50 p-8 rounded-[40px] border border-amber-100 flex gap-6 items-start">
            <div className="p-3 bg-amber-100 text-amber-600 rounded-2xl">
              <AlertCircle size={24} />
            </div>
            <div>
              <h4 className="font-black text-amber-800 text-sm uppercase tracking-widest mb-2">Lưu ý bảo mật</h4>
              <p className="text-xs text-amber-700 leading-relaxed font-medium">
                Hệ thống Nexus sử dụng <b>Geofencing</b> và <b>Device Fingerprinting</b> để xác thực chấm công. 
                Mọi hành vi giả mạo vị trí (Fake GPS) sẽ bị hệ thống SOC tự động khóa tài khoản ngay lập tức.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
