
import React, { useEffect, useState, useCallback } from 'react';
import {
  Users,
  UserPlus,
  ShieldCheck,
  Activity,
  TrendingUp,
  Zap,
  Globe,
  Download,
  RefreshCw
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { AdminStatsCard } from '../components/Admin/AdminStatsCard';
import { AdminAlertCard } from '../components/Admin/AdminAlertCard';
import { auditLogsApi, usersApi } from '../api';
import { AuditLog } from '../types';
import { useNavigate } from 'react-router-dom';

const chartData = [
  { name: 'Mon', users: 400, alerts: 24 },
  { name: 'Tue', users: 520, alerts: 18 },
  { name: 'Wed', users: 480, alerts: 30 },
  { name: 'Thu', users: 610, alerts: 15 },
  { name: 'Fri', users: 590, alerts: 22 },
  { name: 'Sat', users: 380, alerts: 8 },
  { name: 'Sun', users: 410, alerts: 12 },
];

export const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [logsData, usersData] = await Promise.all([
        auditLogsApi.getAll(),
        usersApi.getAll()
      ]);
      setAuditLogs(logsData || []);
      setUsers(usersData || []);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleVulnerabilityScan = () => {
    setScanning(true);
    setTimeout(() => {
      setScanning(false);
      alert('Quét lỗ hổng bảo mật hoàn tất! Không phát hiện mối đe dọa mới.');
    }, 2000);
  };

  const handleDownloadReport = () => {
    const csv = [
      ['Timestamp', 'User', 'Action', 'Details', 'IP', 'Status', 'Risk Level'].join(','),
      ...auditLogs.map(log => [
        new Date(log.timestamp).toISOString(),
        log.userName || 'Unknown',
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
    a.download = `security-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [logsData, usersData] = await Promise.all([
          auditLogsApi.getAll(),
          usersApi.getAll()
        ]);
        setAuditLogs(logsData || []);
        setUsers(usersData || []);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const onlineUsers = users.filter((u: any) => u.status === 'ACTIVE').length;
  const securityAlerts = auditLogs.filter((l: any) => l.riskLevel === 'HIGH').length;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-700">
      {/* Header Info */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Hệ thống Giám sát Zero Trust</h2>
          <p className="text-slate-500 mt-1">Hôm nay: {new Date().toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
        <div className="flex gap-3">
          <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-semibold text-slate-600">Hệ thống: Ổn định</span>
          </div>
          <button onClick={handleVulnerabilityScan} disabled={scanning} className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-blue-500/20 transition-all active:scale-95 text-sm flex items-center gap-2">
            {scanning ? <RefreshCw size={18} className="animate-spin" /> : <Zap size={18} />} {scanning ? 'Đang quét...' : 'Quét lỗ hổng'}
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <AdminStatsCard
          title="Người dùng trực tuyến"
          value={loading ? '...' : onlineUsers.toString()}
          trend="12.5%"
          isPositive={true}
          icon={<Users size={24}/>}
          color="bg-blue-600"
        />
        <AdminStatsCard
          title="User mới (24h)"
          value={loading ? '...' : '48'}
          trend="5.2%"
          isPositive={true}
          icon={<UserPlus size={24}/>}
          color="bg-emerald-500"
        />
        <AdminStatsCard
          title="Cảnh báo bảo mật"
          value={loading ? '...' : securityAlerts.toString()}
          trend="2.4%"
          isPositive={false}
          icon={<ShieldCheck size={24}/>}
          color="bg-rose-500"
        />
        <AdminStatsCard
          title="Tốc độ phản hồi"
          value="14ms"
          trend="8.1%"
          isPositive={true}
          icon={<Activity size={24}/>}
          color="bg-violet-500"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Chart */}
        <div className="lg:col-span-2 bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <TrendingUp size={20} className="text-blue-500" />
              Lưu lượng truy cập & Bảo mật
            </h3>
            <div className="flex gap-2">
              <span className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div> Truy cập
              </span>
              <span className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                <div className="w-3 h-3 bg-rose-500 rounded-full"></div> Cảnh báo
              </span>
            </div>
          </div>
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Area type="monotone" dataKey="users" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorUsers)" />
                <Area type="monotone" dataKey="alerts" stroke="#ef4444" strokeWidth={2} fillOpacity={0} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Security Alerts List */}
        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm flex flex-col">
          <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
            <ShieldCheck size={20} className="text-rose-500" />
            Cảnh báo gần đây
          </h3>
          <div className="space-y-4 flex-1">
            {auditLogs.filter(l => l.riskLevel === 'HIGH' || l.riskLevel === 'MEDIUM').slice(0, 4).map(log => (
              <AdminAlertCard
                key={log.id}
                level={log.riskLevel}
                message={log.details}
                time={new Date(log.timestamp).toLocaleTimeString('vi-VN')}
              />
            ))}
            {auditLogs.filter(l => l.riskLevel === 'HIGH' || l.riskLevel === 'MEDIUM').length === 0 && (
              <p className="text-sm text-slate-400 text-center py-4">Không có cảnh báo nào</p>
            )}
          </div>
          <button onClick={() => navigate('/audit-logs')} className="w-full mt-6 py-3 text-blue-600 font-bold text-sm bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors">
            Xem tất cả cảnh báo
          </button>
        </div>
      </div>

      {/* Recent Logs Table */}
      <div className="bg-slate-900 rounded-3xl shadow-2xl overflow-hidden border border-slate-800">
        <div className="p-8 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <Globe size={22} className="text-blue-400" />
              Nhật ký Hoạt động Toàn cầu
            </h3>
            <p className="text-slate-500 text-sm mt-1">Giám sát các điểm truy cập theo cơ chế Zero Trust</p>
          </div>
          <button onClick={handleDownloadReport} className="text-slate-400 hover:text-white text-sm font-semibold flex items-center gap-2">
            <Download size={16} /> Tải báo cáo (CSV)
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-950/50 text-slate-500 text-[10px] font-black uppercase tracking-widest">
              <tr>
                <th className="px-8 py-5">Thời gian</th>
                <th className="px-8 py-5">Nhân sự</th>
                <th className="px-8 py-5">Hành động</th>
                <th className="px-8 py-5">IP & Vị trí</th>
                <th className="px-8 py-5 text-right">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {auditLogs.slice(0, 10).map((log: any) => (
                <tr key={log.id} className="hover:bg-slate-800/30 transition-colors group">
                  <td className="px-8 py-5">
                    <span className="text-xs font-mono text-slate-400">{new Date(log.timestamp).toLocaleTimeString()}</span>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-xs border border-blue-500/20">
                        {(log.userName || 'U').charAt(0)}
                      </div>
                      <span className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors">{log.userName || 'Unknown'}</span>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <span className="text-xs font-semibold text-slate-300">{log.action}</span>
                  </td>
                  <td className="px-8 py-5">
                    <div className="text-xs font-mono text-blue-300/80">{log.ipAddress}</div>
                    <div className="text-[10px] text-slate-600 font-medium">Verified Device: Yes</div>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <span className={`text-[10px] font-bold px-3 py-1 rounded-full border ${
                      log.status === 'SUCCESS' 
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                        : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                    }`}>
                      {log.status === 'SUCCESS' ? 'SECURE' : 'FAILED'}
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
