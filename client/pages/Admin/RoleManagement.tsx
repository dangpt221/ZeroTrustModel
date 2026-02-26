
import React, { useEffect, useState } from 'react';
import { Role, Permission } from '../../types';
import { rolesApi } from '../../api';
import { Shield, CheckCircle2, Plus, Edit2, Trash2, X, Check } from 'lucide-react';
import { Modal } from '../../components/Admin/Modal';

export const RoleManagement: React.FC = () => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [selectedPerms, setSelectedPerms] = useState<string[]>([]);
  const [formData, setFormData] = useState({ name: '', description: '' });

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

  const handleCreateRole = () => {
    setEditingRole(null);
    setFormData({ name: '', description: '' });
    setSelectedPerms([]);
    setIsModalOpen(true);
  };

  const handleEditRole = (role: Role) => {
    setEditingRole(role);
    setFormData({ name: role.name, description: role.description || '' });
    setSelectedPerms(role.permissions || []);
    setIsModalOpen(true);
  };

  const handleSaveRole = async () => {
    try {
      if (editingRole) {
        await rolesApi.update(editingRole.id, { ...formData, permissions: selectedPerms });
        setRoles(roles.map(r => r.id === editingRole.id ? { ...r, ...formData, permissions: selectedPerms } : r));
      } else {
        const created = await rolesApi.create({ ...formData, permissions: selectedPerms });
        setRoles([...roles, { ...created, id: created.id, color: 'bg-blue-500', permissions: selectedPerms }]);
      }
      setIsModalOpen(false);
      alert(editingRole ? 'Cập nhật vai trò thành công!' : 'Tạo vai trò thành công!');
    } catch (err) {
      console.error('Save role error:', err);
      alert('Thao tác thất bại!');
    }
  };

  const handleDeleteRole = async (id: string) => {
    if (confirm('Bạn có chắc chắn muốn xóa vai trò này?')) {
      try {
        await rolesApi.delete(id);
        setRoles(roles.filter(r => r.id !== id));
        alert('Xóa vai trò thành công!');
      } catch (err) {
        console.error('Delete role error:', err);
        alert('Xóa vai trò thất bại!');
      }
    }
  };

  const togglePermission = (permId: string) => {
    setSelectedPerms(prev =>
      prev.includes(permId) ? prev.filter(p => p !== permId) : [...prev, permId]
    );
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
              <div key={role.id} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:border-blue-200 transition-all group relative">
                <div className="flex justify-between items-start mb-4">
                  <div className={`p-3 ${role.color || 'bg-blue-500'} text-white rounded-2xl shadow-lg`}>
                    <Shield size={24} />
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => handleEditRole(role)} className="text-slate-400 hover:text-blue-600 p-1">
                      <Edit2 size={18} />
                    </button>
                    <button onClick={() => handleDeleteRole(role.id)} className="text-slate-400 hover:text-rose-600 p-1">
                      <Trash2 size={18} />
                    </button>
                  </div>
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

      {/* Role Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingRole ? 'Chỉnh sửa vai trò' : 'Tạo vai trò mới'}
        size="lg"
      >
        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase">Tên vai trò</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full mt-1 px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="Data Auditor"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase">Mô tả</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full mt-1 px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none resize-none"
              rows={2}
              placeholder="Mô tả vai trò..."
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Quyền hạn ({selectedPerms.length} đã chọn)</label>
            <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto p-2 bg-slate-50 rounded-xl">
              {permissions.map(perm => (
                <label
                  key={perm.id}
                  className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-all ${
                    selectedPerms.includes(perm.id) ? 'bg-blue-100 border border-blue-300' : 'bg-white border border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedPerms.includes(perm.id)}
                    onChange={() => togglePermission(perm.id)}
                    className="sr-only"
                  />
                  <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                    selectedPerms.includes(perm.id) ? 'bg-blue-500 border-blue-500' : 'border-slate-300'
                  }`}>
                    {selectedPerms.includes(perm.id) && <Check size={12} className="text-white" />}
                  </div>
                  <span className="text-xs font-bold text-slate-700">{perm.name}</span>
                </label>
              ))}
            </div>
          </div>
          <button
            onClick={handleSaveRole}
            disabled={!formData.name}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white py-3 rounded-xl font-bold transition-all"
          >
            {editingRole ? 'Cập nhật vai trò' : 'Tạo vai trò'}
          </button>
        </div>
      </Modal>
    </div>
  );
};
