
import React, { useEffect, useState, useCallback } from 'react';
import { auditLogsApi } from '../api';
import { AuditLog } from '../types';
import { ShieldAlert, Terminal, Clock, MapPin, Monitor, Filter, RefreshCw, Download, Search } from 'lucide-react';

export const AuditLogs: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterRisk, setFilterRisk] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchLogs = useCallback(async () => {
    try {
      const data = await auditLogsApi.getAll();
      setLogs(data || []);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchLogs, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchLogs]);

  const filteredLogs = logs.filter(log => {
    const matchStatus = filterStatus === 'ALL' || log.status === filterStatus;
    const matchRisk = filterRisk === 'ALL' || log.riskLevel === filterRisk;
    const matchSearch = searchTerm === '' ||
      log.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.details.toLowerCase().includes(searchTerm.toLowerCase());
    return matchStatus && matchRisk && matchSearch;
  });

  const highRiskLogs = logs.filter(l => l.riskLevel === 'HIGH').length;

  const clearFilters = () => {
    setFilterStatus('ALL');
    setFilterRisk('ALL');
    setSearchTerm('');
  };

  const handleExport = () => {
    const csv = [
      ['Timestamp', 'User', 'Action', 'Details', 'IP', 'Status', 'Risk Level'].join(','),
      ...filteredLogs.map(log => [
        new Date(log.timestamp).toISOString(),
        log.userName,
        log.action,
        log.details,
        log.ipAddress,
        log.status,
        log.riskLevel
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-500">
      <div className="bg-slate-900 text-white p-6 sm:p-8 rounded-xl sm:rounded-2xl shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-4 sm:gap-6 overflow-hidden relative">
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <Terminal size={120} />
        </div>
        <div className="relative z-10">
          <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-3">
            <ShieldAlert className="text-red-400" />
            Security & Audit Control
          </h2>
          <p className="text-sm sm:text-base text-slate-400 mt-1">Reviewing 24-hour system activity for compliance</p>
        </div>
        <div className="flex flex-wrap gap-3 sm:gap-4 items-center relative z-10 mt-2 lg:mt-0">
          <div className="bg-white/10 px-3 sm:px-4 py-2 rounded-xl border border-white/5 flex-1 min-w-[120px]">
            <p className="text-[10px] font-bold text-slate-400 uppercase">Alerts</p>
            <p className="text-lg sm:text-xl font-bold">{loading ? '...' : highRiskLogs} Active</p>
          </div>
          <div className="bg-white/10 px-3 sm:px-4 py-2 rounded-xl border border-white/5 flex-1 min-w-[120px]">
            <p className="text-[10px] font-bold text-slate-400 uppercase">Logs</p>
            <p className="text-lg sm:text-xl font-bold">{loading ? '...' : logs.length}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`p-2.5 sm:p-2 rounded-xl transition-all ${autoRefresh ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/10 text-slate-400'}`}
              title={autoRefresh ? 'Tắt tự động làm mới' : 'Bật tự động làm mới'}
            >
              <RefreshCw size={20} className={autoRefresh ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={handleExport}
              className="p-2.5 sm:p-2 bg-white/10 rounded-xl text-slate-300 hover:text-white transition-all"
              title="Xuất CSV"
            >
              <Download size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Search and Filter Bar */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
          <input
            type="text"
            placeholder="Tìm kiếm logs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-2xl py-3 pl-12 pr-4 focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm"
          />
        </div>
        <button
          onClick={() => setIsFilterOpen(!isFilterOpen)}
          className={`bg-white border px-5 py-3 rounded-2xl font-bold text-sm flex items-center gap-2 transition-all ${isFilterOpen ? 'border-blue-500 text-blue-600' : 'border-slate-200 text-slate-600'}`}
        >
          <Filter size={18} /> Bộ lọc {(filterStatus !== 'ALL' || filterRisk !== 'ALL') && <span className="w-2 h-2 bg-blue-500 rounded-full"></span>}
        </button>
      </div>

      {/* Filter Panel */}
      {isFilterOpen && (
        <div className="bg-white p-4 sm:p-6 rounded-xl sm:rounded-2xl border border-slate-200 shadow-lg animate-in slide-in-from-top-2">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-bold text-slate-800">Lọc logs</h4>
            <button onClick={clearFilters} className="text-sm text-blue-600 hover:underline">Xóa bộ lọc</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">Trạng thái</label>
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl text-sm">
                <option value="ALL">Tất cả</option>
                <option value="SUCCESS">Thành công</option>
                <option value="WARNING">Cảnh báo</option>
                <option value="FAILED">Thất bại</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">Mức độ rủi ro</label>
              <select value={filterRisk} onChange={(e) => setFilterRisk(e.target.value)} className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl text-sm">
                <option value="ALL">Tất cả</option>
                <option value="CRITICAL">Nghiêm trọng</option>
                <option value="HIGH">Cao</option>
                <option value="MEDIUM">Trung bình</option>
                <option value="LOW">Thấp</option>
              </select>
            </div>
            <div className="flex items-end">
              <button onClick={fetchLogs} className="w-full bg-blue-600 text-white px-4 py-2 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-blue-700 transition-all">
                <RefreshCw size={16} /> Làm mới
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 text-[10px] font-black uppercase tracking-widest">
              <tr>
                <th className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap">Timestamp</th>
                <th className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap">Identity</th>
                <th className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap">Operation</th>
                <th className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap">Details</th>
                <th className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap">Node / IP</th>
                <th className="px-4 sm:px-6 py-3 sm:py-4 text-right whitespace-nowrap">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2 text-slate-400">
                      <Clock size={14} className="flex-shrink-0" />
                      <span className="text-xs font-mono">{new Date(log.timestamp).toLocaleTimeString()}</span>
                    </div>
                  </td>
                  <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0">
                        {(log.userName || 'U').charAt(0).toUpperCase()}
                      </div>
                      <div className="max-w-[120px] md:max-w-none truncate">
                        <p className="text-xs font-bold text-slate-700 truncate">{log.userName}</p>
                        {log.userEmail && (
                          <p className="text-[10px] text-slate-400 truncate">{log.userEmail}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                    <span className="text-xs font-mono px-2 py-0.5 bg-slate-100 rounded text-slate-600">{log.action}</span>
                  </td>
                  <td className="px-4 sm:px-6 py-3 sm:py-4 min-w-[200px] max-w-[250px] md:max-w-xs whitespace-nowrap">
                    <p className="text-xs text-slate-500 truncate" title={log.details}>{log.details}</p>
                  </td>
                  <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                    <div className="flex flex-col gap-1 max-w-[120px] md:max-w-none">
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-medium truncate">
                        <MapPin size={10} className="flex-shrink-0" /> <span className="truncate">{log.ipAddress || 'Unknown'}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-medium truncate">
                        <Monitor size={10} className="flex-shrink-0" /> <span className="truncate" title={log.device}>{log.device || 'Unknown Device'}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 sm:px-6 py-3 sm:py-4 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-2">
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${
                        log.riskLevel === 'HIGH' || log.riskLevel === 'CRITICAL' ? 'bg-rose-100 text-rose-600' :
                        log.riskLevel === 'MEDIUM' ? 'bg-amber-100 text-amber-600' :
                        'bg-emerald-100 text-emerald-600'
                      }`}>
                        {log.riskLevel || 'LOW'}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${
                        log.status === 'SUCCESS' ? 'bg-emerald-50 text-emerald-600' :
                        log.status === 'WARNING' ? 'bg-amber-50 text-amber-600' :
                        log.status === 'FAILED' ? 'bg-red-50 text-red-600' :
                        'bg-slate-50 text-slate-600'
                      }`}>
                        {log.status || 'SUCCESS'}
                      </span>
                    </div>
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
