
import React from 'react';
import { User } from '../../types';
import { X, Clock, Monitor, MapPin, FileText, ShieldCheck } from 'lucide-react';
import { MOCK_AUDIT_LOGS } from '../../mockData';

interface StaffActionModalProps {
  user: User | null;
  isOpen: boolean;
  onClose: () => void;
}

export const StaffActionModal: React.FC<StaffActionModalProps> = ({ user, isOpen, onClose }) => {
  if (!isOpen || !user) return null;

  const logs = MOCK_AUDIT_LOGS.filter(l => l.userName === user.name).slice(0, 5);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}></div>
      <div className="bg-white w-full max-w-2xl rounded-[40px] shadow-2xl relative z-10 overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-sky-50/30">
          <div className="flex items-center gap-4">
            <img src={user.avatar} className="w-16 h-16 rounded-[24px] object-cover ring-4 ring-white" />
            <div>
              <h3 className="text-xl font-black text-slate-800">{user.name}</h3>
              <p className="text-sm text-slate-500 font-medium">{user.role} • {user.department}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 bg-white text-slate-400 hover:text-slate-600 rounded-2xl shadow-sm">
            <X size={24} />
          </button>
        </div>

        <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <h4 className="font-black text-xs uppercase tracking-widest text-sky-600 flex items-center gap-2">
              <Monitor size={16} /> Thông tin thiết bị
            </h4>
            <div className="bg-slate-50 p-5 rounded-3xl space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white rounded-xl text-slate-400">
                  <Monitor size={16} />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase">Thiết bị cuối</p>
                  <p className="text-xs font-bold text-slate-700">{user.device}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white rounded-xl text-slate-400">
                  <MapPin size={16} />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase">Địa chỉ IP</p>
                  <p className="text-xs font-bold text-slate-700">{user.ipAddress}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white rounded-xl text-slate-400">
                  <ShieldCheck size={16} />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase">Trạng thái MFA</p>
                  <p className={`text-xs font-bold ${user.mfaEnabled ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {user.mfaEnabled ? 'Đã kích hoạt' : 'Chưa kích hoạt'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <h4 className="font-black text-xs uppercase tracking-widest text-indigo-600 flex items-center gap-2">
              <Clock size={16} /> Lịch sử hoạt động gần đây
            </h4>
            <div className="space-y-4">
              {logs.length > 0 ? logs.map((log) => (
                <div key={log.id} className="flex gap-3 group">
                  <div className="mt-1 w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0"></div>
                  <div>
                    <p className="text-xs font-bold text-slate-700">{log.action}</p>
                    <p className="text-[10px] text-slate-400">{new Date(log.timestamp).toLocaleTimeString()}</p>
                  </div>
                </div>
              )) : (
                <p className="text-xs italic text-slate-400">Chưa có bản ghi hoạt động.</p>
              )}
            </div>
          </div>
        </div>

        <div className="p-8 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
          <button className="px-6 py-2.5 bg-white text-slate-600 border border-slate-200 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-slate-100 transition-all">
            Xem log chi tiết
          </button>
          <button className="px-6 py-2.5 bg-sky-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-sky-700 transition-all shadow-lg shadow-sky-500/20">
            Export báo cáo Staff
          </button>
        </div>
      </div>
    </div>
  );
};
