
import React, { useEffect, useState } from 'react';
import { Role, Permission } from '../../types';
import { rolesApi } from '../../api';
import { Shield, CheckCircle2, MoreVertical, Plus } from 'lucide-react';

export const RoleManagement: React.FC = () => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [rolesData, permsData] = await Promise.all([
          rolesApi.getAll(),
          rolesApi.getPermissions()
        ]);
        setRoles(rolesData || []);
        setPermissions(permsData || []);
      } catch (err) {
        console.error('Fetch RBAC data error:', err);
      }
    };

    fetchData();
  }, []);

  const handleCreateRole = async () => {
    const name = window.prompt('Tên vai trò mới (ví dụ: Data Auditor):');
    if (!name) return;

    try {
      const created = await rolesApi.create({ name, permissions: [] });
      setRoles(prev => [...prev, created]);
    } catch (err) {
      console.error('Create role error:', err);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black text-slate-800 uppercase italic">Phân quyền RBAC</h2>
          <p className="text-slate-500 text-sm">Cấu hình vai trò và quyền hạn truy cập tài nguyên doanh nghiệp</p>
        </div>
        <button
          onClick={handleCreateRole}
          className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-blue-500/20 active:scale-95 transition-all"
        >
          <Plus size={18} /> Tạo vai trò mới
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Roles List */}
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {roles.map(role => (
              <div key={role.id} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:border-blue-200 transition-all group">
                <div className="flex justify-between items-start mb-4">
                  <div className={`p-3 ${role.color} text-white rounded-2xl shadow-lg`}>
                    <Shield size={24} />
                  </div>
                  <button className="text-slate-400 hover:text-slate-600 p-1">
                    <MoreVertical size={20} />
                  </button>
                </div>
                <h3 className="text-lg font-black text-slate-800 mb-1">{role.name}</h3>
                <p className="text-xs text-slate-400 mb-6">{role.permissions.length} quyền được cấp</p>
                
                <div className="flex flex-wrap gap-2">
                  {role.permissions.slice(0, 3).map(pId => {
                    const p = permissions.find(perm => perm.id === pId);
                    return (
                      <span key={pId} className="text-[10px] font-bold bg-slate-50 text-slate-600 px-2 py-1 rounded-lg border border-slate-100">
                        {p?.name}
                      </span>
                    );
                  })}
                  {role.permissions.length > 3 && (
                    <span className="text-[10px] font-black text-blue-600 px-2 py-1">+{role.permissions.length - 3} nữa</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Permissions Tree / List */}
        <div className="bg-slate-900 rounded-[40px] p-8 text-white relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 p-8 opacity-5">
            <Shield size={120} />
          </div>
          <h3 className="text-xl font-black mb-6 flex items-center gap-2">
            <CheckCircle2 className="text-emerald-400" />
            Tất cả Quyền hạn
          </h3>
          <div className="space-y-5 relative z-10">
            {permissions.map(p => (
              <div key={p.id} className="group cursor-pointer">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-bold group-hover:text-blue-400 transition-colors">{p.name}</p>
                  <span className="text-[10px] font-mono text-slate-500">{p.code}</span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">{p.description}</p>
              </div>
            ))}
          </div>
          <div className="mt-10 p-4 bg-white/5 rounded-2xl border border-white/10">
            <p className="text-[11px] text-slate-400 italic">
              Lưu ý: Mọi thay đổi quyền hạn sẽ có hiệu lực ngay lập tức cho toàn bộ người dùng thuộc vai trò đó.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
