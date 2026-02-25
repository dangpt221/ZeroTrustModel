
import React from 'react';
import { Smartphone, Monitor, Trash2, CheckCircle2 } from 'lucide-react';

export const DeviceList: React.FC = () => {
  const devices = [
    { id: '1', name: 'MacBook Pro 14"', type: 'DESKTOP', lastActive: 'Hiện tại', isCurrent: true, ip: '192.168.1.105' },
    { id: '2', name: 'iPhone 15 Pro', type: 'MOBILE', lastActive: '2 giờ trước', isCurrent: false, ip: '103.45.21.88' },
  ];

  return (
    <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
          <Monitor size={16} className="text-emerald-500" /> Thiết bị được tin cậy
        </h3>
        <button className="text-[10px] font-bold text-emerald-600 uppercase hover:underline">Thêm thiết bị mới</button>
      </div>

      <div className="divide-y divide-slate-50">
        {devices.map(device => (
          <div key={device.id} className="py-4 flex items-center justify-between group">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-2xl ${device.isCurrent ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-400'}`}>
                {device.type === 'DESKTOP' ? <Monitor size={20} /> : <Smartphone size={20} />}
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  {device.name}
                  {device.isCurrent && <span className="text-[10px] bg-emerald-500 text-white px-2 py-0.5 rounded-full">Hiện tại</span>}
                </p>
                <p className="text-[10px] text-slate-400 font-medium">{device.ip} • {device.lastActive}</p>
              </div>
            </div>
            {!device.isCurrent && (
              <button className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all opacity-0 group-hover:opacity-100">
                <Trash2 size={18} />
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-start gap-3">
        <CheckCircle2 className="text-emerald-500 shrink-0" size={18} />
        <p className="text-[11px] text-emerald-800 font-medium leading-relaxed">
          Tài khoản của bạn đang áp dụng chính sách <b>Trusted Device Only</b>. Mọi phiên đăng nhập từ thiết bị lạ sẽ yêu cầu phê duyệt đa lớp.
        </p>
      </div>
    </div>
  );
};
