
import React from 'react';
import { 
  Users, 
  UserPlus, 
  ShieldCheck, 
  Activity, 
  TrendingUp, 
  Zap,
  Globe
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell
} from 'recharts';
import { AdminStatsCard } from '../components/Admin/AdminStatsCard';
import { AdminAlertCard } from '../components/Admin/AdminAlertCard';
import { MOCK_AUDIT_LOGS } from '../mockData';

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
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-blue-500/20 transition-all active:scale-95 text-sm flex items-center gap-2">
            <Zap size={18} /> Quét lỗ hổng
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <AdminStatsCard 
          title="Người dùng trực tuyến" 
          value="1,248" 
          trend="12.5%" 
          isPositive={true} 
          icon={<Users size={24}/>} 
          color="bg-blue-600"
        />
        <AdminStatsCard 
          title="User mới (24h)" 
          value="48" 
          trend="5.2%" 
          isPositive={true} 
          icon={<UserPlus size={24}/>} 
          color="bg-emerald-500"
        />
        <AdminStatsCard 
          title="Cảnh báo bảo mật" 
          value="12" 
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
            <AdminAlertCard 
              level="HIGH" 
              message="Phát hiện đăng nhập trái phép từ IP 103.52.xx.xx tại Trung Quốc." 
              time="2 phút trước"
            />
            <AdminAlertCard 
              level="MEDIUM" 
              message="MFA bị bỏ qua 3 lần liên tiếp tại tài khoản 'manager@nexus.com'." 
              time="15 phút trước"
            />
            <AdminAlertCard 
              level="LOW" 
              message="Đã cập nhật chính sách bảo mật cho bộ phận Engineering." 
              time="1 giờ trước"
            />
            <AdminAlertCard 
              level="MEDIUM" 
              message="Phát hiện thiết bị lạ cố gắng truy cập tài liệu bảo mật." 
              time="2 giờ trước"
            />
          </div>
          <button className="w-full mt-6 py-3 text-blue-600 font-bold text-sm bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors">
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
          <button className="text-slate-400 hover:text-white text-sm font-semibold">Tải báo cáo (PDF)</button>
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
              {MOCK_AUDIT_LOGS.map((log) => (
                <tr key={log.id} className="hover:bg-slate-800/30 transition-colors group">
                  <td className="px-8 py-5">
                    <span className="text-xs font-mono text-slate-400">{new Date(log.timestamp).toLocaleTimeString()}</span>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-xs border border-blue-500/20">
                        {log.userName.charAt(0)}
                      </div>
                      <span className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors">{log.userName}</span>
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
