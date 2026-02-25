
import React from 'react';
import { MOCK_AUDIT_LOGS } from '../mockData';
import { ShieldAlert, Terminal, Clock, MapPin, Monitor } from 'lucide-react';

export const AuditLogs: React.FC = () => {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="bg-slate-900 text-white p-8 rounded-2xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6 overflow-hidden relative">
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <Terminal size={120} />
        </div>
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-3">
            <ShieldAlert className="text-red-400" />
            Security & Audit Control
          </h2>
          <p className="text-slate-400 mt-1">Reviewing 24-hour system activity for compliance</p>
        </div>
        <div className="flex gap-4">
          <div className="bg-white/10 px-4 py-2 rounded-xl border border-white/5">
            <p className="text-[10px] font-bold text-slate-400 uppercase">Alerts</p>
            <p className="text-xl font-bold">0 Active</p>
          </div>
          <div className="bg-white/10 px-4 py-2 rounded-xl border border-white/5">
            <p className="text-[10px] font-bold text-slate-400 uppercase">Logs</p>
            <p className="text-xl font-bold">{MOCK_AUDIT_LOGS.length}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 text-[10px] font-black uppercase tracking-widest">
              <tr>
                <th className="px-6 py-4">Timestamp</th>
                <th className="px-6 py-4">Identity</th>
                <th className="px-6 py-4">Operation</th>
                <th className="px-6 py-4">Details</th>
                <th className="px-6 py-4">Node / IP</th>
                <th className="px-6 py-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {MOCK_AUDIT_LOGS.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-slate-400">
                      <Clock size={14} />
                      <span className="text-xs font-mono">{new Date(log.timestamp).toLocaleTimeString()}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-600">
                        {log.userName.charAt(0)}
                      </div>
                      <span className="text-xs font-bold text-slate-700">{log.userName}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs font-mono px-2 py-0.5 bg-slate-100 rounded text-slate-600">{log.action}</span>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-xs text-slate-500 max-w-xs truncate">{log.details}</p>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-medium">
                        <MapPin size={10} /> {log.ipAddress}
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-medium">
                        <Monitor size={10} /> Verified HW
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${
                      log.status === 'SUCCESS' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
                    }`}>
                      {log.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
