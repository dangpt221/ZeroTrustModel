
import React, { useState, useEffect } from 'react';
import { usersApi } from '../../api';
import { User } from '../../types';
import { Search, UserPlus, Filter, FileDown, Lock, Unlock, Shield } from 'lucide-react';

export const StaffManagement: React.FC = () => {
  const [staff, setStaff] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchStaff = async () => {
      try {
        const data = await usersApi.getAll();
        const filtered = (data || []).filter((u: User) => u.role !== 'ADMIN');
        setStaff(filtered);
      } catch (error) {
        console.error('Error fetching staff:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchStaff();
  }, []);

  const filteredStaff = staff.filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 uppercase italic">Quản lý nhân sự</h2>
          <p className="text-slate-500 text-sm">Theo dõi và quản lý hoạt động của nhân viên trong bộ phận</p>
        </div>
        <button className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-blue-500/20 active:scale-95 transition-all">
          <UserPlus size={18} /> Thêm nhân viên
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
          <input
            type="text"
            placeholder="Tìm nhân viên..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-2xl py-3.5 pl-12 pr-4 focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm font-medium"
          />
        </div>
        <button className="bg-white border border-slate-200 text-slate-600 px-6 py-2 rounded-2xl font-bold text-sm flex items-center gap-2 hover:bg-slate-50 transition-all">
          <Filter size={18} /> Lọc
        </button>
        <button className="bg-white border border-slate-200 text-slate-600 px-6 py-2 rounded-2xl font-bold text-sm flex items-center gap-2 hover:bg-slate-50 transition-all">
          <FileDown size={18} /> Xuất Excel
        </button>
      </div>

      <div className="bg-white rounded-[32px] shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 text-[10px] font-black uppercase tracking-widest">
              <tr>
                <th className="px-8 py-6">Nhân viên</th>
                <th className="px-8 py-6">Vai trò</th>
                <th className="px-8 py-6">Trust Score</th>
                <th className="px-8 py-6">Thiết bị</th>
                <th className="px-8 py-6">Trạng thái</th>
                <th className="px-8 py-6 text-right">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-8 py-12 text-center text-slate-400">Đang tải...</td>
                </tr>
              ) : filteredStaff.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-8 py-12 text-center text-slate-400">Không tìm thấy nhân viên</td>
                </tr>
              ) : (
                filteredStaff.map(user => (
                  <tr key={user.id} className="hover:bg-slate-50/30 transition-colors group">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-4">
                        <img src={user.avatar} className="w-11 h-11 rounded-2xl object-cover ring-2 ring-white shadow-sm" />
                        <div>
                          <p className="text-sm font-bold text-slate-800">{user.name}</p>
                          <p className="text-[11px] text-slate-400 font-medium">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase border ${
                        user.role === 'MANAGER' ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-slate-50 text-slate-500 border-slate-200'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                          <div className={`h-full ${user.trustScore > 80 ? 'bg-emerald-500' : 'bg-amber-500'}`} style={{ width: `${user.trustScore}%` }}></div>
                        </div>
                        <span className="text-xs font-bold text-slate-600">{user.trustScore}%</span>
                      </div>
                    </td>
                    <td className="px-8 py-5 text-xs text-slate-500">{user.device}</td>
                    <td className="px-8 py-5">
                      <span className={`text-[10px] font-black px-3 py-1 rounded-full ${
                        user.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'
                      }`}>
                        {user.status}
                      </span>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <div className="flex justify-end gap-1">
                        <button className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all">
                          <Shield size={18} />
                        </button>
                        <button className={`p-2 rounded-xl transition-all ${user.status === 'ACTIVE' ? 'text-amber-500 hover:bg-amber-50' : 'text-emerald-500 hover:bg-emerald-50'}`}>
                          {user.status === 'ACTIVE' ? <Lock size={18} /> : <Unlock size={18} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
