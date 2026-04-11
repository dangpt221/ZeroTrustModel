
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
  RefreshCw,
  UserCheck,
  UserX
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { motion } from 'framer-motion';
import { AdminStatsCard } from '../components/Admin/AdminStatsCard';
import { AdminAlertCard } from '../components/Admin/AdminAlertCard';
import { auditLogsApi, usersApi } from '../api';
import { AuditLog } from '../types';
import { useNavigate } from 'react-router-dom';



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

  const handleApprove = async (id: string) => {
    try {
      await usersApi.approve(id);
      setUsers(prev => prev.map(u => (u.id === id ? { ...u, status: 'ACTIVE' } : u)));
      alert('Phê duyệt người dùng thành công!');
    } catch (err) {
      console.error('Approve error:', err);
    }
  };

  const handleReject = async (id: string) => {
    if (confirm('Từ chối và xóa yêu cầu này?')) {
      try {
        await usersApi.reject(id);
        setUsers(prev => prev.filter(u => u.id !== id));
      } catch (err) {
        console.error('Reject error:', err);
      }
    }
  };

  const handleDownloadReport = () => {
    const csv = [
      ['Timestamp', 'User', 'Action', 'Details', 'IP', 'Status', 'Risk Level'].join(','),
      ...(auditLogs || []).map(log => [
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

  const onlineUsers = users?.filter ? users.filter((u: any) => u.status === 'ACTIVE').length : 0;
  
  const now = Date.now();
  const oneDay = 24 * 60 * 60 * 1000;
  const newUsersCount = users?.filter ? users.filter((u: any) => u.createdAt && (now - new Date(u.createdAt).getTime() <= oneDay)).length : 0;
  const prevUsersCount = users?.filter ? users.filter((u: any) => u.createdAt && (now - new Date(u.createdAt).getTime() > oneDay) && (now - new Date(u.createdAt).getTime() <= 2 * oneDay)).length : 0;
  const usersTrend = prevUsersCount === 0 ? (newUsersCount > 0 ? 100 : 0) : ((newUsersCount - prevUsersCount) / prevUsersCount * 100).toFixed(1);

  const securityAlerts = auditLogs?.filter ? auditLogs.filter((l: any) => l.riskLevel === 'HIGH').length : 0;
  const prevAlerts = auditLogs?.filter ? auditLogs.filter((l: any) => l.riskLevel === 'HIGH' && (now - new Date(l.timestamp).getTime() > oneDay) && (now - new Date(l.timestamp).getTime() <= 2 * oneDay)).length : 0;
  const currentAlerts24h = auditLogs?.filter ? auditLogs.filter((l: any) => l.riskLevel === 'HIGH' && (now - new Date(l.timestamp).getTime() <= oneDay)).length : 0;
  const alertsTrend = prevAlerts === 0 ? (currentAlerts24h > 0 ? 100 : 0) : ((currentAlerts24h - prevAlerts) / prevAlerts * 100).toFixed(1);

  const generateChartData = () => {
    if (!auditLogs || !Array.isArray(auditLogs) || auditLogs.length === 0) {
      const daysStr = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const today = new Date();
      return Array.from({length: 7}).map((_, i) => {
        const d = new Date(today);
        d.setDate(d.getDate() - (6 - i));
        return { name: daysStr[d.getDay()], users: 0, alerts: 0 };
      });
    }

    const daysStr = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const data = [];
    const today = new Date();
    
    for(let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      d.setHours(0,0,0,0);
      const nextD = new Date(d);
      nextD.setDate(nextD.getDate() + 1);
      
      let activityCount = auditLogs.filter((l: any) => {
        if(!l.timestamp || !l.action) return false;
        const logTime = new Date(l.timestamp).getTime();
        return logTime >= d.getTime() && logTime < nextD.getTime() && String(l.action).includes('LOGIN');
      }).length;
      
      const alertsCount = auditLogs.filter((l: any) => {
         if(!l.timestamp) return false;
         const logTime = new Date(l.timestamp).getTime();
         return logTime >= d.getTime() && logTime < nextD.getTime() && (l.riskLevel === 'HIGH' || l.riskLevel === 'MEDIUM');
      }).length;

      data.push({
        name: daysStr[d.getDay()],
        users: activityCount,
        alerts: alertsCount
      });
    }
    return data;
  };
  const dynamicChartData = generateChartData();

  const formatTime = (ts: any) => {
    try {
      if (!ts) return '--:--:--';
      const date = new Date(ts);
      return isNaN(date.getTime()) ? '--:--:--' : date.toLocaleTimeString();
    } catch {
      return '--:--:--';
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5 }
    }
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-4 md:space-y-8"
    >
      {/* Header Info */}
      <div>
        <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">Hệ thống Giám sát Zero Trust</h2>
        <p className="text-sm md:text-base text-slate-500 mt-1">Hôm nay: {new Date().toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
        <motion.div variants={itemVariants}>
          <AdminStatsCard
            title="Tài khoản hoạt động"
            value={loading ? '...' : onlineUsers.toString()}
            trend={`${usersTrend}%`}
            isPositive={Number(usersTrend) >= 0}
            icon={<Users size={24} />}
            color="bg-blue-600"
          />
        </motion.div>
        <motion.div variants={itemVariants}>
          <AdminStatsCard
            title="User mới (24h)"
            value={loading ? '...' : newUsersCount.toString()}
            trend={`${usersTrend}%`}
            isPositive={Number(usersTrend) >= 0}
            icon={<UserPlus size={24} />}
            color="bg-emerald-500"
          />
        </motion.div>
        <motion.div variants={itemVariants}>
          <AdminStatsCard
            title="Cảnh báo bảo mật"
            value={loading ? '...' : securityAlerts.toString()}
            trend={`${alertsTrend}%`}
            isPositive={Number(alertsTrend) <= 0}
            icon={<ShieldCheck size={24} />}
            color="bg-rose-500"
          />
        </motion.div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-8">
        {/* Main Chart */}
        <motion.div variants={itemVariants} className="lg:col-span-2 bg-white p-4 md:p-8 rounded-2xl md:rounded-3xl border border-slate-100 shadow-sm premium-card">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 md:mb-8">
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
          <div className="h-[250px] sm:h-[300px] md:h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dynamicChartData}>
                <defs>
                  <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorAlerts" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <YAxis dataKey="users" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} domain={[0, 'dataMax + 10']} />
                <Tooltip
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Area type="monotone" dataKey="users" stroke="#3b82f6" strokeWidth={4} fillOpacity={1} fill="url(#colorUsers)" activeDot={{ r: 6, strokeWidth: 0 }} />
                <Area type="monotone" dataKey="alerts" stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill="url(#colorAlerts)" activeDot={{ r: 6, strokeWidth: 0, fill: '#ef4444' }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Security Alerts List */}
        <motion.div variants={itemVariants} className="bg-white p-4 md:p-8 rounded-2xl md:rounded-3xl border border-slate-100 shadow-sm flex flex-col premium-card">
          <h3 className="text-lg font-bold text-slate-800 mb-4 md:mb-6 flex items-center gap-2">
            <ShieldCheck size={20} className="text-rose-500" />
            Cảnh báo gần đây
          </h3>
          <div className="space-y-4 flex-1">
            {auditLogs?.filter && auditLogs.filter(l => l.riskLevel === 'HIGH' || l.riskLevel === 'MEDIUM').slice(0, 4).map(log => (
              <AdminAlertCard
                key={log.id}
                level={log.riskLevel as 'HIGH' | 'MEDIUM' | 'LOW'}
                message={log.details}
                time={formatTime(log.timestamp)}
              />
            ))}
            {(!auditLogs || !auditLogs.filter || auditLogs.filter(l => l.riskLevel === 'HIGH' || l.riskLevel === 'MEDIUM').length === 0) && (
              <p className="text-sm text-slate-400 text-center py-4">Không có cảnh báo nào</p>
            )}
          </div>
          <button onClick={() => navigate('/audit-logs')} className="w-full mt-6 py-3 text-blue-600 font-bold text-sm bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors">
            Xem tất cả cảnh báo
          </button>
        </motion.div>
      </div>

      {/* Pending Approvals Section */}
      {users.filter(u => u.status === 'PENDING').length > 0 && (
        <div className="bg-white p-4 md:p-8 rounded-2xl md:rounded-3xl border border-slate-100 shadow-sm animate-in fade-in zoom-in-95 duration-500">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 md:mb-8">
            <h3 className="text-lg md:text-xl font-bold text-slate-800 flex items-center gap-2">
              <UserPlus size={22} className="text-amber-500 shrink-0" />
              Yêu cầu phê duyệt mới ({users.filter(u => u.status === 'PENDING').length})
            </h3>
            <button onClick={() => navigate('/admin/users')} className="text-sm font-bold text-blue-600 hover:underline px-4 py-2 bg-blue-50 rounded-lg shrink-0">Quản lý tất cả</button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {users.filter(u => u.status === 'PENDING').map(pendingUser => (
              <div key={pendingUser.id} className="bg-slate-50 border border-slate-100 p-5 rounded-2xl flex items-center justify-between group hover:border-blue-200 hover:bg-white transition-all shadow-sm hover:shadow-md">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center font-bold text-blue-600 shadow-sm">
                    {pendingUser.name?.charAt(0) || 'U'}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-800 line-clamp-1">{pendingUser.name}</h4>
                    <p className="text-[10px] text-slate-400 font-medium">{pendingUser.email}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleApprove(pendingUser.id)}
                    className="p-2.5 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 shadow-lg shadow-emerald-500/20 active:scale-90 transition-all"
                    title="Phê duyệt"
                  >
                    <UserCheck size={18} />
                  </button>
                  <button
                    onClick={() => handleReject(pendingUser.id)}
                    className="p-2.5 bg-rose-500 text-white rounded-xl hover:bg-rose-600 shadow-lg shadow-rose-500/20 active:scale-90 transition-all"
                    title="Từ chối"
                  >
                    <UserX size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Logs Table */}
      <motion.div variants={itemVariants} className="bg-slate-900 rounded-2xl md:rounded-3xl shadow-2xl overflow-hidden border border-slate-800">
        <div className="p-4 md:p-8 border-b border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg md:text-xl font-bold text-white flex items-center gap-2">
              <Globe size={22} className="text-blue-400 shrink-0" />
              <span className="truncate">Nhật ký Hoạt động Toàn cầu</span>
            </h3>
            <p className="text-slate-500 text-xs md:text-sm mt-1">Giám sát các điểm truy cập theo cơ chế Zero Trust</p>
          </div>
          <button onClick={handleDownloadReport} className="text-slate-400 hover:text-white text-sm font-semibold flex items-center gap-2">
            <Download size={16} /> Tải báo cáo (CSV)
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-950/50 text-slate-500 text-[10px] font-black uppercase tracking-widest">
              <tr>
                <th className="px-4 md:px-8 py-3 md:py-5 whitespace-nowrap">Thời gian</th>
                <th className="px-4 md:px-8 py-3 md:py-5 whitespace-nowrap">Nhân sự</th>
                <th className="px-4 md:px-8 py-3 md:py-5 whitespace-nowrap">Hành động</th>
                <th className="px-4 md:px-8 py-3 md:py-5 whitespace-nowrap">IP & Vị trí</th>
                <th className="px-4 md:px-8 py-3 md:py-5 text-right whitespace-nowrap">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {auditLogs?.slice && auditLogs.slice(0, 10).map((log: any) => (
                <tr key={log.id} className="hover:bg-slate-800/30 transition-colors group">
                  <td className="px-4 md:px-8 py-3 md:py-5 whitespace-nowrap">
                    <span className="text-xs font-mono text-slate-400">{formatTime(log.timestamp)}</span>
                  </td>
                  <td className="px-4 md:px-8 py-3 md:py-5 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-xs shrink-0 border border-blue-500/20">
                        {(log.userName || 'U').charAt(0)}
                      </div>
                      <span className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors truncate max-w-[120px] md:max-w-none">{log.userName || 'Unknown'}</span>
                    </div>
                  </td>
                  <td className="px-4 md:px-8 py-3 md:py-5 whitespace-nowrap">
                    <span className="text-xs font-semibold text-slate-300">{log.action}</span>
                  </td>
                  <td className="px-4 md:px-8 py-3 md:py-5 whitespace-nowrap">
                    <div className="flex flex-col gap-1">
                      <div className="text-xs font-mono text-blue-300/80">{log.ipAddress}</div>
                      <div className="text-[10px] text-slate-400 font-medium truncate max-w-[150px] md:max-w-[200px]" title={log.device}>{log.device || 'Unknown Device'}</div>
                    </div>
                  </td>
                  <td className="px-4 md:px-8 py-3 md:py-5 text-right whitespace-nowrap">
                    <span className={`text-[10px] font-bold px-3 py-1 rounded-full border ${log.status === 'SUCCESS'
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
      </motion.div>
    </motion.div>
  );
};
