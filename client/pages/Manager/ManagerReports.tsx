
import React from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend, Cell
} from 'recharts';
import { Download, FileDown, TrendingUp, ShieldAlert, Zap, Users } from 'lucide-react';

const accessData = [
  { name: 'Thứ 2', success: 400, denied: 24 },
  { name: 'Thứ 3', success: 300, denied: 18 },
  { name: 'Thứ 4', success: 500, denied: 45 },
  { name: 'Thứ 5', success: 280, denied: 10 },
  { name: 'Thứ 6', success: 590, denied: 22 },
];

export const ManagerReports: React.FC = () => {
  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black text-slate-800 uppercase italic">Báo cáo & Phân tích</h2>
          <p className="text-slate-500 text-sm">Tổng hợp chỉ số an toàn và hiệu suất bộ phận Engineering</p>
        </div>
        <div className="flex gap-3">
          <button className="bg-white border border-slate-200 text-slate-600 px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 hover:bg-slate-50 transition-all shadow-sm">
            <FileDown size={18} /> Xuất CSV
          </button>
          <button className="bg-sky-600 text-white px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 hover:bg-sky-700 transition-all shadow-lg shadow-sky-500/20">
            <Download size={18} /> Tải PDF
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Tỉ lệ chặn truy cập</p>
          <h3 className="text-3xl font-black text-rose-600">4.2%</h3>
          <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
            <TrendingUp size={14} className="text-rose-500" /> +1.2% so với tháng trước
          </p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Xác thực MFA thành công</p>
          <h3 className="text-3xl font-black text-emerald-600">99.8%</h3>
          <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
            <Zap size={14} className="text-emerald-500" /> Hệ thống ổn định
          </p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Staff hoạt động tích cực</p>
          <h3 className="text-3xl font-black text-sky-600">22/24</h3>
          <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
            <Users size={14} className="text-sky-500" /> +2 User mới tuần này
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm">
          <h3 className="font-black text-slate-700 mb-8 flex items-center gap-2 uppercase text-xs tracking-widest">
            <TrendingUp size={18} className="text-sky-500" />
            Lưu lượng truy cập tài liệu
          </h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={accessData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                <Tooltip 
                  contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="success" fill="#0ea5e9" radius={[10, 10, 0, 0]} barSize={40} />
                <Bar dataKey="denied" fill="#ef4444" radius={[10, 10, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm">
          <h3 className="font-black text-slate-700 mb-8 flex items-center gap-2 uppercase text-xs tracking-widest">
            <ShieldAlert size={18} className="text-rose-500" />
            Phân tích rủi ro thiết bị
          </h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={accessData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="denied" stroke="#ef4444" strokeWidth={4} dot={{r: 6}} activeDot={{r: 8}} name="Từ chối truy cập" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
