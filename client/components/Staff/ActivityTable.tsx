
import React from 'react';
import { AuditLog } from '../../types';
import { Clock, Monitor, MapPin, ShieldCheck, AlertCircle } from 'lucide-react';

interface ActivityTableProps {
  logs: AuditLog[];
}

export const ActivityTable: React.FC<ActivityTableProps> = ({ logs }) => {
  return (
    <div className="bg-white rounded-[40px] shadow-sm border border-slate-100 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-slate-50/50 text-slate-500 text-[10px] font-black uppercase tracking-widest border-b border-slate-100">
            <tr>
              <th className="px-10 py-6">Thời gian</th>
              <th className="px-10 py-6">Hành động thực hiện</th>
              <th className="px-10 py-6">Trạm truy cập</th>
              <th className="px-10 py-6 text-right">Mức độ rủi ro</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {logs.length > 0 ? logs.map((log) => (
              <tr key={log.id} className="hover:bg-emerald-50/30 transition-colors group">
                <td className="px-10 py-6">
                  <div className="flex items-center gap-3 text-slate-500">
                    <div className="p-2 bg-slate-100 rounded-lg">
                      <Clock size={16} />
                    </div>
                    <span className="text-xs font-bold">{new Date(log.timestamp).toLocaleString('vi-VN')}</span>
                  </div>
                </td>
                <td className="px-10 py-6">
                  <div className="flex flex-col">
                    <span className="text-sm font-black text-slate-800 group-hover:text-emerald-600 transition-colors">{log.action}</span>
                    <p className="text-[11px] text-slate-400 font-medium mt-0.5">{log.details}</p>
                  </div>
                </td>
                <td className="px-10 py-6">
                  <div className="flex flex-col gap-1.5 text-[10px] text-slate-500 font-bold uppercase tracking-tighter">
                    <span className="flex items-center gap-2"><Monitor size={14} className="text-slate-400" /> Authorized Device</span>
                    <span className="flex items-center gap-2"><MapPin size={14} className="text-slate-400" /> {log.ipAddress}</span>
                  </div>
                </td>
                <td className="px-10 py-6 text-right">
                  <span className={`text-[10px] font-black px-4 py-1.5 rounded-full border flex items-center gap-1.5 justify-end w-fit ml-auto ${
                    log.status === 'SUCCESS' 
                      ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                      : 'bg-rose-50 text-rose-600 border-rose-100'
                  }`}>
                    {log.status === 'SUCCESS' ? <ShieldCheck size={12} /> : <AlertCircle size={12} />}
                    {log.status === 'SUCCESS' ? 'XÁC MINH' : 'CẢNH BÁO'}
                  </span>
                </td>
              </tr>
            )) : (
               <tr>
                <td colSpan={4} className="py-20 text-center text-slate-400 italic font-bold">Không có hoạt động nào được ghi lại.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
