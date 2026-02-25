
import React, { useEffect, useState } from 'react';
import { User, UserRole } from '../../types';
import { 
  Search, 
  UserPlus, 
  ShieldCheck, 
  Lock, 
  Unlock, 
  Edit3, 
  Trash2,
  Filter,
  Monitor,
  MapPin,
  Smartphone
} from 'lucide-react';

export const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await fetch('/api/admin/users');
        if (res.ok) {
          const data = await res.json();
          setUsers(data);
        }
      } catch (err) {
        console.error('Fetch admin users error:', err);
      }
    };

    fetchUsers();
  }, []);

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleStatus = async (id: string) => {
    const target = users.find(u => u.id === id);
    if (!target) return;
    const nextStatus = target.status === 'ACTIVE' ? 'LOCKED' : 'ACTIVE';

    try {
      const res = await fetch(`/api/admin/users/${id}/lock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus })
      });
      if (res.ok) {
        const updated = await res.json();
        setUsers(prev => prev.map(u => (u.id === id ? updated : u)));
      }
    } catch (err) {
      console.error('Toggle status error:', err);
    }
  };

  const toggleMFA = async (id: string) => {
    const target = users.find(u => u.id === id);
    if (!target) return;
    const newState = !target.mfaEnabled;

    try {
      const res = await fetch(`/api/admin/users/${id}/mfa`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: newState })
      });
      if (res.ok) {
        const updated = await res.json();
        setUsers(prev => prev.map(u => (u.id === id ? updated : u)));
        alert(`Đã ${newState ? 'Bật' : 'Tắt'} bắt buộc OTP cho người dùng ${updated.name}.`);
      }
    } catch (err) {
      console.error('Toggle MFA error:', err);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight uppercase italic">Quản lý định danh</h2>
          <p className="text-slate-500 text-sm">Quản lý truy cập và trạng thái tin cậy của nhân sự toàn hệ thống</p>
        </div>
        <button className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-blue-500/20 flex items-center gap-2 transition-all active:scale-95">
          <UserPlus size={18} /> Thêm nhân sự mới
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
          <input 
            type="text" 
            placeholder="Tìm theo tên, email hoặc bộ phận..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-2xl py-3.5 pl-12 pr-4 focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm"
          />
        </div>
        <button className="bg-white border border-slate-200 text-slate-600 px-5 py-2 rounded-2xl font-bold text-sm flex items-center gap-2 hover:bg-slate-50 transition-all">
          <Filter size={18} /> Bộ lọc
        </button>
      </div>

      <div className="bg-white rounded-[32px] shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 text-[10px] font-black uppercase tracking-widest">
              <tr>
                <th className="px-8 py-6">Nhân sự</th>
                <th className="px-8 py-6">Vai trò / MFA</th>
                <th className="px-8 py-6">Trust Score</th>
                <th className="px-8 py-6">Thiết bị cuối</th>
                <th className="px-8 py-6">Trạng thái</th>
                <th className="px-8 py-6 text-right">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-blue-50/30 transition-colors group">
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <img src={user.avatar} className="w-11 h-11 rounded-2xl object-cover ring-2 ring-white shadow-sm" />
                        <div className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 border-2 border-white rounded-full ${user.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800">{user.name}</p>
                        <p className="text-[11px] text-slate-400 font-medium">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex flex-col gap-1">
                      <span className={`w-fit text-[10px] font-black px-2 py-0.5 rounded uppercase border ${
                        user.role === UserRole.ADMIN ? 'bg-blue-50 text-blue-600 border-blue-100' :
                        user.role === UserRole.MANAGER ? 'bg-amber-50 text-amber-600 border-amber-100' :
                        'bg-slate-50 text-slate-500 border-slate-200'
                      }`}>
                        {user.role}
                      </span>
                      <button 
                        onClick={() => toggleMFA(user.id)}
                        className={`w-fit flex items-center gap-1 text-[9px] font-black uppercase tracking-tighter py-0.5 px-1.5 rounded border transition-all ${
                          user.mfaEnabled ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-100 text-slate-400 border-slate-200'
                        }`}
                      >
                        <Smartphone size={10} /> {user.mfaEnabled ? 'MFA ACTIVE' : 'FORCE MFA'}
                      </button>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between text-[10px] font-black uppercase">
                        <span className={user.trustScore > 80 ? 'text-emerald-500' : 'text-amber-500'}>{user.trustScore}% Verified</span>
                      </div>
                      <div className="w-28 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all duration-1000 ${user.trustScore > 80 ? 'bg-emerald-500' : 'bg-amber-500'}`} 
                          style={{width: `${user.trustScore}%`}}
                        ></div>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <div className="space-y-1">
                      <p className="text-[11px] text-slate-600 flex items-center gap-1.5 font-medium">
                        <Monitor size={12} className="text-slate-400" /> {user.device}
                      </p>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <span className={`text-[10px] font-black px-3 py-1 rounded-full ${
                      user.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'
                    }`}>
                      {user.status}
                    </span>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => toggleStatus(user.id)}
                        className={`p-2 rounded-xl transition-all ${user.status === 'ACTIVE' ? 'text-amber-500 hover:bg-amber-50' : 'text-emerald-500 hover:bg-emerald-50'}`}
                      >
                        {user.status === 'ACTIVE' ? <Lock size={18} /> : <Unlock size={18} />}
                      </button>
                      <button className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-all">
                        <Trash2 size={18} />
                      </button>
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
