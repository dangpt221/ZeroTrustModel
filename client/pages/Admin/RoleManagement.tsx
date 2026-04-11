import React, { useEffect, useState } from 'react';
import { usersApi, rolesApi } from '../../api';
import { User, Role, Permission } from '../../types';
import { Shield, CheckCircle2, Plus, Edit2, Trash2, X, Check, Search, ShieldAlert, UserCheck, ChevronRight, Save, LayoutGrid, Users } from 'lucide-react';
import { Modal } from '../../components/Admin/Modal';
import { AnimatePresence, motion } from 'framer-motion';

export const RoleManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'USERS' | 'ROLES'>('USERS');

  // Shared Data
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  // Users Tab State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingUserRole, setEditingUserRole] = useState<string>('STAFF');
  const [editingUserCustomRoles, setEditingUserCustomRoles] = useState<string[]>([]);

  // Roles Tab State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [selectedPerms, setSelectedPerms] = useState<string[]>([]);
  const [formData, setFormData] = useState({ name: '', description: '' });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [rolesData, permsData, usersData] = await Promise.all([
          rolesApi.getAll(),
          rolesApi.getPermissions(),
          usersApi.getAll()
        ]);
        setRoles(rolesData || []);
        setPermissions(permsData || []);
        setUsers(usersData || []);
      } catch (err) {
        console.error('Fetch RBAC data error:', err);
      }
    };
    fetchData();
  }, []);

  // ====== USERS TAB LOGIC ======
  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelectUser = (user: User) => {
    setSelectedUser(user);
    setEditingUserRole(user.role as string);
    setEditingUserCustomRoles(user.customRoles?.map((r: any) => r._id || r.id) || []);
    setIsDrawerOpen(true);
  };

  const handleSaveUserRoles = async () => {
    if (!selectedUser) return;
    try {
      const updatedUser = await usersApi.update(selectedUser.id, {
        role: editingUserRole,
        customRoles: editingUserCustomRoles
      });
      setUsers(users.map(u => u.id === selectedUser.id ? { ...u, role: updatedUser.role, customRoles: roles.filter(r => editingUserCustomRoles.includes(r.id)) as any } : u));
      setIsDrawerOpen(false);
      alert('Cập nhật quyền hạn người dùng thành công!');
    } catch (err) {
      console.error('Update user roles error:', err);
      alert('Thao tác thất bại!');
    }
  };

  const toggleUserCustomRole = (roleId: string) => {
    setEditingUserCustomRoles(prev => 
      prev.includes(roleId) ? prev.filter(id => id !== roleId) : [...prev, roleId]
    );
  };

  // Derive all permissions the selected user has from customRoles
  const userCombinedPermissions = Array.from(new Set(
    editingUserCustomRoles.flatMap(roleId => {
      const r = roles.find(r => r.id === roleId);
      return r ? (r.permissions as string[]) : [];
    })
  ));

  // ====== ROLES TAB LOGIC ======
  const handleCreateRole = () => {
    setEditingRole(null);
    setFormData({ name: '', description: '' });
    setSelectedPerms([]);
    setIsModalOpen(true);
  };

  const handleEditRole = (role: Role) => {
    setEditingRole(role);
    setFormData({ name: role.name, description: role.description || '' });
    setSelectedPerms(role.permissions as string[] || []);
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

  const getRoleBadgeColor = (role: string) => {
    switch(role) {
      case 'ADMIN': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'MANAGER': return 'bg-amber-100 text-amber-700 border-amber-200';
      default: return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700 relative h-[calc(100vh-120px)] flex flex-col">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 flex-shrink-0">
        
        
        <div className="flex bg-slate-100 p-1 rounded-2xl">
          <button 
            onClick={() => setActiveTab('USERS')}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all text-sm ${activeTab === 'USERS' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <Users size={18} /> Phân quyền Nhân sự
          </button>
          <button 
            onClick={() => setActiveTab('ROLES')}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all text-sm ${activeTab === 'ROLES' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <LayoutGrid size={18} /> Quản lý Vai trò (Roles)
          </button>
        </div>
      </div>

      {/* ===================== USERS TAB (ASSIGNMENTS) ===================== */}
      {activeTab === 'USERS' && (
        <div className="flex-1 flex gap-6 overflow-hidden relative">
          
          {/* Main List */}
          <div className="flex-1 bg-white rounded-[32px] border border-slate-100 shadow-sm flex flex-col overflow-hidden">
            <div className="p-4 md:p-6 border-b border-slate-100/60 bg-slate-50/50">
              <div className="relative">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Tìm kiếm nhân viên để phân quyền..." 
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all font-medium text-slate-700 shadow-sm"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {filteredUsers.map(user => (
                <div 
                  key={user.id} 
                  onClick={() => handleSelectUser(user)}
                  className={`group flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer ${selectedUser?.id === user.id ? 'bg-blue-50 border-blue-200 shadow-sm ring-1 ring-blue-500' : 'bg-white border-slate-100 hover:border-blue-200 hover:bg-slate-50'}`}
                >
                  <div className="flex items-center gap-4">
                    <img src={user.avatar} className="w-12 h-12 rounded-xl object-cover shadow-sm bg-slate-100" />
                    <div>
                      <h4 className="font-bold text-slate-800 group-hover:text-blue-600 transition-colors">{user.name}</h4>
                      <p className="text-xs text-slate-500">{user.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex flex-col items-end gap-1.5">
                      <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-lg border ${getRoleBadgeColor(user.role as string)}`}>
                        {user.role}
                      </span>
                      {user.customRoles && user.customRoles.length > 0 && (
                        <div className="flex gap-1">
                          {user.customRoles.map((r: any) => (
                            <span key={r.id || r._id} className="text-[9px] font-bold bg-slate-800 text-white px-1.5 py-0.5 rounded uppercase">
                              {r.name.substring(0,10)}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <ChevronRight size={18} className={`transition-transform duration-300 ${selectedUser?.id === user.id ? 'text-blue-500 translate-x-1' : 'text-slate-300 group-hover:text-blue-400 group-hover:translate-x-1'}`} />
                  </div>
                </div>
              ))}
              
              {filteredUsers.length === 0 && (
                <div className="p-10 text-center text-slate-400">Không tìm thấy người dùng phù hợp</div>
              )}
            </div>
          </div>

          {/* Slide Over Drawer (Absolute positioning over the right side or just side-by-side) */}
          <AnimatePresence>
            {isDrawerOpen && selectedUser && (
              <motion.div 
                initial={{ opacity: 0, x: 50, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 20, scale: 0.98 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="w-full lg:w-[450px] flex-shrink-0 bg-white rounded-[32px] border border-slate-200 shadow-2xl flex flex-col overflow-hidden z-20"
              >
                {/* Drawer Header */}
                <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-4 md:p-8 pb-10 text-white relative flex-shrink-0">
                  <button 
                    onClick={() => setIsDrawerOpen(false)}
                    className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
                  >
                    <X size={18} />
                  </button>
                  <div className="flex items-center gap-5">
                    <div className="relative">
                      <img src={selectedUser.avatar} className="w-16 h-16 rounded-2xl object-cover ring-4 ring-white/10" />
                      <div className="absolute -bottom-2 -right-2 bg-emerald-500 w-6 h-6 rounded-full border-4 border-slate-800 flex items-center justify-center">
                        <Check size={10} className="text-white" />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-xl font-black">{selectedUser.name}</h3>
                      <p className="text-sm text-slate-300">{selectedUser.email}</p>
                    </div>
                  </div>
                </div>

                {/* Drawer Scrollable Content */}
                <div className="flex-1 overflow-y-auto bg-slate-50 relative -mt-4 rounded-t-3xl border-t border-white shadow-[0_-10px_20px_-5px_rgba(0,0,0,0.1)]">
                  <div className="p-4 md:p-8 space-y-8">
                    
                    {/* System Role Selection */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-sm font-black text-slate-800 uppercase tracking-tight">
                        <UserCheck size={18} className="text-blue-500" /> Vai trò hệ thống cơ bản
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {['STAFF', 'MANAGER', 'ADMIN'].map((role) => (
                          <button
                            key={role}
                            onClick={() => setEditingUserRole(role)}
                            className={`p-3 rounded-2xl border-2 text-center transition-all ${editingUserRole === role ? 'border-blue-500 bg-blue-50 shadow-sm' : 'border-slate-100 bg-white hover:border-slate-300'}`}
                          >
                            <span className={`block text-[11px] font-black uppercase ${editingUserRole === role ? 'text-blue-700' : 'text-slate-500'}`}>{role}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="h-px bg-slate-200/60 -mx-8"></div>

                    {/* Custom Role Selection */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm font-black text-slate-800 uppercase tracking-tight">
                          <LayoutGrid size={18} className="text-indigo-500" /> Vai trò mở rộng (Custom Roles)
                        </div>
                        <span className="text-xs font-bold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-lg">{editingUserCustomRoles.length} đang gán</span>
                      </div>
                      
                      <div className="space-y-2">
                        {roles.map(role => (
                          <div 
                            key={role.id}
                            onClick={() => toggleUserCustomRole(role.id)}
                            className={`flex items-center gap-3 p-4 rounded-2xl border-2 transition-all cursor-pointer ${editingUserCustomRoles.includes(role.id) ? 'border-indigo-500 bg-indigo-50/50' : 'border-slate-100 bg-white hover:border-slate-200'}`}
                          >
                            <div className={`w-5 h-5 rounded flex items-center justify-center shrink-0 transition-colors ${editingUserCustomRoles.includes(role.id) ? 'bg-indigo-500 text-white' : 'border-2 border-slate-300'}`}>
                              {editingUserCustomRoles.includes(role.id) && <Check size={14} />}
                            </div>
                            <div className="flex-1">
                              <h4 className={`font-bold text-sm ${editingUserCustomRoles.includes(role.id) ? 'text-indigo-900' : 'text-slate-700'}`}>{role.name}</h4>
                              <p className="text-xs text-slate-500 line-clamp-1">{role.description || `${role.permissions.length} quyền hạn`}</p>
                            </div>
                          </div>
                        ))}
                        {roles.length === 0 && (
                          <p className="text-sm text-slate-500 italic p-4 bg-white rounded-xl border border-slate-100 text-center">Chưa có vai trò custom nào được tạo.</p>
                        )}
                      </div>
                    </div>

                    <div className="h-px bg-slate-200/60 -mx-8"></div>

                    {/* Permissions Tree Preview */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm font-black text-slate-800 uppercase tracking-tight">
                          <CheckCircle2 size={18} className="text-emerald-500" /> Chi tiết Quyền hạn thực tế
                        </div>
                        <span className="text-xs font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-lg">{userCombinedPermissions.length} quyền</span>
                      </div>
                      
                      <div className="bg-slate-900 text-white p-5 rounded-3xl space-y-3">
                        {userCombinedPermissions.length === 0 ? (
                          <div className="text-slate-500 text-sm text-center py-4 md:py-6">Người dùng chưa được gán quyền mở rộng nào.</div>
                        ) : (
                          // Render permissions as a tree/list
                          permissions.filter(p => userCombinedPermissions.includes(p.id)).map(p => (
                            <div key={p.id} className="flex items-start gap-3">
                              <Check size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                              <div>
                                <p className="text-sm font-bold text-slate-200">{p.name}</p>
                                <p className="text-[10px] font-mono text-emerald-400/80 mt-0.5">{p.code}</p>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                  </div>
                </div>
                
                {/* Drawer Footer */}
                <div className="p-4 md:p-6 bg-white border-t border-slate-100 flex-shrink-0 z-10 shadow-[0_-10px_20px_-10px_rgba(0,0,0,0.05)]">
                  <button 
                    onClick={handleSaveUserRoles}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-wider py-4 rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-lg shadow-blue-500/30"
                  >
                    <Save size={18} /> Lưu Phân Quyền
                  </button>
                </div>

              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}


      {/* ===================== ROLES TAB (ORIGINAL VIEW) ===================== */}
      {activeTab === 'ROLES' && (
        <div className="flex-1 overflow-y-auto">
          <div className="bg-white p-4 md:p-8 rounded-[32px] border border-slate-100 shadow-sm animate-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h3 className="text-2xl font-black text-slate-800 tracking-tight">Danh sách Vai trò</h3>
                <p className="text-slate-500 text-sm">Quản lý và tạo mới các vai trò mở rộng (Custom Roles).</p>
              </div>
              <button
                onClick={handleCreateRole}
                className="bg-slate-900 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg hover:bg-slate-800 transition-all"
              >
                <Plus size={18} /> Tạo vai trò mới
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {roles.map(role => (
                <div key={role.id} className="bg-slate-50 p-4 md:p-6 rounded-3xl border border-slate-200 hover:border-blue-300 transition-all group relative">
                  <div className="flex justify-between items-start mb-4">
                    <div className={`p-3 ${role.color || 'bg-indigo-500'} text-white rounded-2xl shadow-lg`}>
                      <Shield size={24} />
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleEditRole(role)} className="bg-white text-slate-500 hover:text-blue-600 p-2 rounded-xl shadow-sm border border-slate-100">
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => handleDeleteRole(role.id)} className="bg-white text-slate-500 hover:text-rose-600 p-2 rounded-xl shadow-sm border border-slate-100">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  <h3 className="text-lg font-black text-slate-800 mb-1">{role.name}</h3>
                  <p className="text-xs text-slate-400 mb-6">{role.permissions.length} quyền hạn được đóng gói</p>

                  <div className="flex flex-wrap gap-2">
                    {role.permissions.slice(0, 4).map(pId => {
                      const p = permissions.find(perm => perm.id === pId);
                      return (
                        <span key={pId as string} className="text-[10px] font-bold bg-white text-slate-600 px-2 py-1 rounded-lg border border-slate-200">
                          {p?.name}
                        </span>
                      );
                    })}
                    {role.permissions.length > 4 && (
                      <span className="text-[10px] font-black text-blue-600 px-2 py-1 bg-blue-50 rounded-lg">+{role.permissions.length - 4} nữa</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Role Management Modal (for creating/editing roles) */}
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
              placeholder="Ví dụ: Data Auditor"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase">Mô tả</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full mt-1 px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none resize-none"
              rows={2}
              placeholder="Mô tả quyền hạn của vai trò này..."
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Gán Quyền ({selectedPerms.length} đã chọn)</label>
            <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto p-4 bg-slate-50 border border-slate-200 rounded-xl">
              {permissions.map(perm => (
                <div
                  key={perm.id}
                  onClick={() => togglePermission(perm.id)}
                  className={`flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-all ${
                    selectedPerms.includes(perm.id) ? 'bg-blue-100 border-blue-300 ring-1 ring-blue-500' : 'bg-white border text-slate-600 hover:border-blue-200'
                  }`}
                >
                  <div className={`mt-0.5 w-5 h-5 rounded border flex items-center justify-center shrink-0 ${
                    selectedPerms.includes(perm.id) ? 'bg-blue-600 border-blue-600' : 'border-slate-300 bg-white'
                  }`}>
                    {selectedPerms.includes(perm.id) && <Check size={14} className="text-white" />}
                  </div>
                  <div>
                    <span className={`block text-xs font-bold ${selectedPerms.includes(perm.id) ? 'text-blue-900' : 'text-slate-700'}`}>{perm.name}</span>
                    <span className="block text-[10px] font-mono text-slate-400">{perm.code}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <button
            onClick={handleSaveRole}
            disabled={!formData.name}
            className="w-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white py-4 rounded-xl font-bold transition-all shadow-lg"
          >
            {editingRole ? 'Lưu cập nhật Vai trò' : 'Tạo Vai trò mới'}
          </button>
        </div>
      </Modal>

    </div>
  );
};
