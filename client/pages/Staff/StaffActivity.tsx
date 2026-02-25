
import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { auditLogsApi } from '../../api';
import { AuditLog } from '../../types';
import { History, Download, AlertTriangle, FileText, CheckCircle2 } from 'lucide-react';

export const StaffActivity: React.FC = () => {
  const { user } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const data = await auditLogsApi.getAll();
        const userLogs = (data || []).filter((log: AuditLog) =>
          log.userName === user?.name || log.userId === user?.id
        );
        setLogs(userLogs);
      } catch (error) {
        console.error('Error fetching logs:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, [user]);

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
            <Download size={16} /> CSV
          </button>
          <button
            onClick={() => handleExport('PDF')}
            className="bg-slate-900 text-white px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center gap-2 shadow-lg shadow-slate-900/20"
          >
            <FileText size={16} /> PDF
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <CheckCircle2 size={20} className="text-emerald-500" />
            <p className="text-xs text-slate-400 font-bold uppercase">Thao tác thành công</p>
          </div>
          <p className="text-3xl font-black text-slate-800">{loading ? '...' : logs.filter(l => l.status === 'SUCCESS').length}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <AlertTriangle size={20} className="text-amber-500" />
            <p className="text-xs text-slate-400 font-bold uppercase">Cảnh báo</p>
          </div>
          <p className="text-3xl font-black text-slate-800">{loading ? '...' : logs.filter(l => l.riskLevel === 'MEDIUM').length}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <History size={20} className="text-blue-500" />
            <p className="text-xs text-slate-400 font-bold uppercase">Tổng hoạt động</p>
          </div>
          <p className="text-3xl font-black text-slate-800">{loading ? '...' : logs.length}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 text-[10px] font-black uppercase tracking-widest">
              <tr>
                <th className="px-6 py-4">Thời gian</th>
                <th className="px-6 py-4">Hành động</th>
                <th className="px-6 py-4">Chi tiết</th>
                <th className="px-6 py-4">IP</th>
                <th className="px-6 py-4 text-right">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {logs.slice(0, 20).map(log => (
                <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 text-xs font-mono text-slate-400">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs font-medium px-2 py-1 bg-slate-100 rounded text-slate-600">
                      {log.action}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs text-slate-500 max-w-xs truncate">
                    {log.details}
                  </td>
                  <td className="px-6 py-4 text-xs font-mono text-slate-400">
                    {log.ipAddress}
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
