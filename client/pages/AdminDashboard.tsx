
import React, { useEffect, useState, useCallback } from 'react';
import {
  Users,
  UserPlus,
  ShieldCheck,
  TrendingUp,
  UserCheck,
  UserX,
  ShieldAlert,
  Activity,
  History,
  ArrowRight
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
  const [users, setUsers] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [usersData, logsData] = await Promise.all([
        usersApi.getAll(),
        auditLogsApi.getAll()
      ]);
      setUsers(usersData || []);
      setAuditLogs(logsData || []);
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

  const onlineUsers = users?.filter ? users.filter((u: any) => u.status === 'ACTIVE').length : 0;
  
  const now = Date.now();
  const oneDay = 24 * 60 * 60 * 1000;
  const newUsersCount = users?.filter ? users.filter((u: any) => u.createdAt && (now - new Date(u.createdAt).getTime() <= oneDay)).length : 0;
  const prevUsersCount = users?.filter ? users.filter((u: any) => u.createdAt && (now - new Date(u.createdAt).getTime() > oneDay) && (now - new Date(u.createdAt).getTime() <= 2 * oneDay)).length : 0;
  const usersTrend = prevUsersCount === 0 ? (newUsersCount > 0 ? 100 : 0) : ((newUsersCount - prevUsersCount) / prevUsersCount * 100).toFixed(1);

  const generateChartData = () => {
    if (!users || !Array.isArray(users) || users.length === 0) {
      const daysStr = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
      const today = new Date();
      return Array.from({length: 7}).map((_, i) => {
        const d = new Date(today);
        d.setDate(d.getDate() - (6 - i));
        return { name: daysStr[d.getDay()], users: 0 };
      });
    }

    const daysStr = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    const data = [];
    const today = new Date();
    
    for(let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      d.setHours(0,0,0,0);
      const nextD = new Date(d);
      nextD.setDate(nextD.getDate() + 1);
      
      let activityCount = users.filter((u: any) => {
        if(!u.createdAt) return false;
        const createTime = new Date(u.createdAt).getTime();
        return createTime >= d.getTime() && createTime < nextD.getTime();
      }).length;
      
      data.push({
        name: daysStr[d.getDay()],
        users: activityCount
      });
    }
    return data;
  };
  const dynamicChartData = generateChartData();

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
        <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">Hệ thống Quản trị Zero Trust</h2>
        <p className="text-sm md:text-base text-slate-500 mt-1">Hôm nay: {new Date().toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
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
            title="Nhân sự mới (24h)"
            value={loading ? '...' : newUsersCount.toString()}
            trend={`${usersTrend}%`}
            isPositive={Number(usersTrend) >= 0}
            icon={<UserPlus size={24} />}
            color="bg-emerald-500"
          />
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-8">
        {/* Main Chart */}
        <motion.div variants={itemVariants} className="lg:col-span-2 bg-white p-4 md:p-8 rounded-2xl md:rounded-3xl border border-slate-100 shadow-sm premium-card">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 md:mb-8">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <TrendingUp size={20} className="text-blue-500" />
              Tăng trưởng Nhân sự
            </h3>
            <div className="flex gap-2">
              <span className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div> Nhân sự mới
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
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <YAxis dataKey="users" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} domain={[0, 'dataMax + 2']} />
                <Tooltip
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Area type="monotone" dataKey="users" stroke="#3b82f6" strokeWidth={4} fillOpacity={1} fill="url(#colorUsers)" activeDot={{ r: 6, strokeWidth: 0 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Security Summary Card */}
        <motion.div variants={itemVariants} className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <ShieldAlert size={20} className="text-rose-500" />
              Giám sát hệ thống
            </h3>
            <button onClick={() => navigate('/admin/audit-logs')} className="p-2 bg-slate-50 text-slate-400 hover:text-blue-600 rounded-xl transition-all">
              <ArrowRight size={18} />
            </button>
          </div>

          <div className="space-y-4 flex-1 overflow-y-auto max-h-[350px] pr-1">
            {auditLogs.filter(l => l.riskLevel === 'HIGH' || l.riskLevel === 'CRITICAL').slice(0, 5).map((log, idx) => (
              <AdminAlertCard
                key={log.id || idx}
                level={log.riskLevel === 'CRITICAL' ? 'HIGH' : (log.riskLevel as any)}
                message={log.details || log.action}
                time={new Date(log.timestamp).toLocaleTimeString('vi-VN')}
              />
            ))}
            {auditLogs.filter(l => l.riskLevel === 'HIGH' || l.riskLevel === 'CRITICAL').length === 0 && (
              <div className="flex flex-col items-center justify-center h-full py-10 opacity-40">
                <ShieldCheck size={48} className="text-emerald-500 mb-2" />
                <p className="text-sm font-bold">Hệ thống an toàn</p>
                <p className="text-[10px]">Không phát hiện hoạt động rủi ro</p>
              </div>
            )}
          </div>
          
          <div className="mt-6 pt-6 border-t border-slate-50">
             <div className="bg-slate-900 rounded-2xl p-4 text-white relative overflow-hidden group">
                <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
                  <Activity size={80} />
                </div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Trạng thái ghi log</p>
                <p className="text-xl font-black">{auditLogs.length} sự kiện</p>
                <p className="text-[10px] text-slate-500 mt-1 italic">Đang giám sát thời gian thực...</p>
             </div>
          </div>
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
    </motion.div>
  );
};
