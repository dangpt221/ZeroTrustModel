
import React, { useEffect, useState } from 'react';
import { departmentsApi, usersApi, projectsApi } from '../../api';
import { Department, User, Project } from '../../types';
import { Building2, Users, UserCheck, Plus, Trash2, Edit2, FolderKanban, FolderOpen, Check } from 'lucide-react';
import { Modal } from '../../components/Admin/Modal';

export const DepartmentManagement: React.FC = () => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [detailDept, setDetailDept] = useState<Department | null>(null);
  const [detailData, setDetailData] = useState<Department | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isChangingManager, setIsChangingManager] = useState(false);
  const [selectedManagerId, setSelectedManagerId] = useState<string>('');
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState<string>('');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    managerId: '',
    parentId: '',
    color: '#3B82F6',
    code: '',
    isActive: true
  });

  // Colors for department
  const colorOptions = [
    '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
    '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'
  ];

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [deptData, usersData, projectsData] = await Promise.all([
          departmentsApi.getAll(),
          usersApi.getAll(),
          projectsApi.getAll()
        ]);
        setDepartments(deptData || []);
        setUsers(usersData || []);
        setProjects(projectsData || []);
      } catch (error) {
        console.error('Error fetching departments:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Fetch detailed department info
  const fetchDepartmentDetails = async (deptId: string) => {
    try {
      const detail = await departmentsApi.getById(deptId);
      setDetailData(detail);
    } catch (error) {
      console.error('Error fetching department details:', error);
    }
  };

  const handleDelete = async (id: string) => {
    console.log('handleDelete called with id:', id);
    const dept = departments.find(d => d.id === id);
    console.log('Department:', dept);
    const membersInDept = users.filter(u => u.departmentId === id);
    console.log('Members in dept:', membersInDept.length);

    if (membersInDept.length > 0) {
      const otherDepts = departments.filter(d => d.id !== id);
      if (otherDepts.length === 0) {
        alert('Khong the xoa bo phan nay vi co nhan vien va khong co bo phan nao khac de chuyen.');
        return;
      }

      const moveTo = prompt(`Bo phan nay co ${membersInDept.length} nhan vien. Nhap ID bo phan de chuyen nhan vien den:\n\nCac bo phan hien co:\n${otherDepts.map(d => `- ${d.name} (ID: ${d.id})`).join('\n')}`);

      if (!moveTo) return;

      const targetDept = otherDepts.find(d => d.id === moveTo || d.name === moveTo);
      if (!targetDept) {
        alert('Khong tim thay bo phan dich!');
        return;
      }

      try {
        await departmentsApi.delete(id, targetDept.id);
        setDepartments(departments.filter(d => d.id !== id));
        alert('Xoa bo phan thanh cong! Nhan vien da duoc chuyen den ' + targetDept.name);
      } catch (err) {
        console.error('Delete department error:', err);
        alert('Xoa bo phan that bai!');
      }
    } else {
      if (confirm('Ban co chan chan muon xoa bo phan nay?')) {
        try {
          await departmentsApi.delete(id);
          setDepartments(departments.filter(d => d.id !== id));
          alert('Xoa bo phan thanh cong!');
        } catch (err) {
          console.error('Delete department error:', err);
          alert('Xoa bo phan that bai!');
        }
      }
    }
  };

  const handleCreateOrUpdate = async () => {
    try {
      const data = {
        name: formData.name,
        description: formData.description,
        managerId: formData.managerId || undefined,
        parentId: formData.parentId || undefined,
        color: formData.color,
        code: formData.code || formData.name.substring(0, 3).toUpperCase(),
        isActive: formData.isActive
      };

      if (editingDept) {
        const updated = await departmentsApi.update(editingDept.id, data);
        setDepartments(departments.map(d => d.id === editingDept.id ? { ...d, ...updated } : d));
        alert('Cap nhat bo phan thanh cong!');
      } else {
        const created = await departmentsApi.create(data);
        setDepartments([...departments, { ...created, memberCount: 0, projectCount: 0 }]);
        alert('Tao bo phan thanh cong!');
      }
      setIsModalOpen(false);
      setEditingDept(null);
      resetForm();
    } catch (err: any) {
      console.error('Save department error:', err);
      alert(err.response?.data?.message || 'Thao tac that bai!');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      managerId: '',
      parentId: '',
      color: '#3B82F6',
      code: '',
      isActive: true
    });
  };

  const openCreateModal = () => {
    resetForm();
    setEditingDept(null);
    setIsModalOpen(true);
  };

  const openEditModal = (dept: Department) => {
    console.log('openEditModal called with dept:', dept);
    setEditingDept(dept);
    setFormData({
      name: dept.name,
      description: dept.description || '',
      managerId: dept.managerId || '',
      parentId: dept.parentId || '',
      color: dept.color || '#3B82F6',
      code: dept.code || '',
      isActive: dept.isActive !== false
    });
    setIsModalOpen(true);
  };

  const openDetailModal = async (dept: Department) => {
    setDetailDept(dept);
    setIsDetailModalOpen(true);
    await fetchDepartmentDetails(dept.id);
  };

  // Filter departments
  const filteredDepartments = departments.filter(dept =>
    dept.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (dept.description && dept.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Get available managers (only show users with MANAGER role)
  const availableManagers = users.filter(u => {
    // Only show users with MANAGER role
    if (u.role !== 'MANAGER') return false;
    return true;
  });

  // Stats
  const totalMembers = users.length;
  const totalProjects = projects.length;

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex justify-end mb-2">
        <div className="flex flex-col md:flex-row w-full md:w-auto gap-3">
          <div className="bg-white px-4 py-3 sm:py-2 rounded-xl border border-slate-200 flex flex-wrap justify-between md:justify-start items-center gap-3">
            <div className="flex items-center gap-2">
              <Building2 size={16} className="text-blue-500 shrink-0" />
              <span className="text-sm font-medium whitespace-nowrap">{departments.length} bo phan</span>
            </div>
            <div className="hidden md:block w-px h-4 bg-slate-200"></div>
            <div className="flex items-center gap-2">
              <Users size={16} className="text-emerald-500 shrink-0" />
              <span className="text-sm font-medium whitespace-nowrap">{totalMembers} nhan vien</span>
            </div>
            <div className="hidden md:block w-px h-4 bg-slate-200"></div>
            <div className="flex items-center gap-2 w-full md:w-auto justify-center md:justify-start pt-2 md:pt-0 border-t md:border-0 border-slate-100">
              <FolderKanban size={16} className="text-amber-500 shrink-0" />
              <span className="text-sm font-medium whitespace-nowrap">{totalProjects} du an</span>
            </div>
          </div>
          <button onClick={openCreateModal} className="w-full md:w-auto shrink-0 justify-center bg-blue-600 text-white px-6 py-3 md:py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-blue-500/20 active:scale-95 transition-all">
            <Plus size={18} /> Them bo phan
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <input
          type="text"
          placeholder="Tim kiem bo phan..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-white border border-slate-200 rounded-2xl py-3.5 pl-12 pr-4 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
        />
      </div>

      {/* Department Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full text-center py-12">
            <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
            <p className="text-slate-500 mt-2">Dang tai...</p>
          </div>
        ) : filteredDepartments.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <Building2 size={48} className="mx-auto text-slate-300" />
            <p className="text-slate-500 mt-2">Khong tim thay bo phan nao</p>
          </div>
        ) : (
          filteredDepartments.map(dept => {
            const manager = users.find(u => u.id === dept.managerId);
            const memberCount = users.filter(u => u.departmentId === dept.id).length;
            const projectCount = projects.filter(p => p.departmentId === dept.id).length;
            const parentDept = departments.find(d => d.id === dept.parentId);

            return (
              <div key={dept.id} className={`bg-white p-4 md:p-6 rounded-[32px] border shadow-sm hover:shadow-md transition-all group relative overflow-hidden ${dept.isActive === false ? 'opacity-60' : ''}`}>
                {/* Color bar */}
                <div className="absolute top-0 left-0 right-0 h-1" style={{ backgroundColor: dept.color || '#3B82F6' }}></div>

                <div className="absolute top-0 right-0 p-4 md:p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                  <Building2 size={80} />
                </div>

                <div className="flex justify-between items-start mb-4 relative z-20">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-2xl" style={{ backgroundColor: `${dept.color || '#3B82F6'}20` }}>
                      <Building2 size={20} style={{ color: dept.color || '#3B82F6' }} />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-slate-800">{dept.name}</h3>
                      {dept.code && <span className="text-[10px] font-bold text-slate-400 uppercase">{dept.code}</span>}
                    </div>
                  </div>
                  <div className="flex gap-1 z-30">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        console.log('Edit button clicked for dept:', dept.id);
                        openEditModal(dept);
                      }}
                      className="p-2.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all cursor-pointer border border-transparent hover:border-blue-100"
                      title="Chỉnh sửa bộ phận"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        console.log('Delete button clicked for dept:', dept.id);
                        handleDelete(dept.id);
                      }}
                      className="p-2.5 text-slate-500 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all cursor-pointer border border-transparent hover:border-rose-100"
                      title="Xóa bộ phận"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>

                <p className="text-xs text-slate-400 font-medium leading-relaxed mb-4 line-clamp-2">{dept.description || 'Khong co mo ta'}</p>

                {parentDept && (
                  <div className="text-xs text-slate-500 mb-3 flex items-center gap-1">
                    <FolderOpen size={12} />
                    <span>Thuoc: {parentDept.name}</span>
                  </div>
                )}

                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                    <div className="flex items-center gap-2 text-slate-500">
                      <Users size={14} />
                      <span className="text-[10px] font-black uppercase">Nhan su</span>
                    </div>
                    <span className="text-sm font-bold text-slate-800">{memberCount}</span>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                    <div className="flex items-center gap-2 text-slate-500">
                      <UserCheck size={14} />
                      <span className="text-[10px] font-black uppercase">Quan ly</span>
                    </div>
                    {manager ? (
                      <div className="flex items-center gap-2">
                        <img src={manager.avatar} className="w-5 h-5 rounded-full object-cover" alt="" />
                        <span className="text-xs font-bold" style={{ color: dept.color || '#3B82F6' }}>{manager.name}</span>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">Chua co</span>
                    )}
                  </div>
                </div>

                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => openDetailModal(dept)}
                    className="flex-1 py-2.5 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 transition-colors"
                  >
                    Chi tiet
                  </button>
                </div>

                {dept.isActive === false && (
                  <div className="absolute top-12 right-4 bg-rose-500 text-white text-[10px] font-bold px-2 py-1 rounded">
                    INACTIVE
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingDept ? 'Chinh sua bo phan' : 'Them bo phan moi'}
      >
        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase">Ten bo phan *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full mt-1 px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="Phong Ky thuat"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-500 uppercase">Ma bo phan</label>
            <input
              type="text"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
              className="w-full mt-1 px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="IT, HR, MARKETING..."
              maxLength={10}
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-500 uppercase">Mo ta</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full mt-1 px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none resize-none"
              rows={3}
              placeholder="Mo ta bo phan..."
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-500 uppercase">Bo phan cha</label>
            <select
              value={formData.parentId}
              onChange={(e) => setFormData({ ...formData, parentId: e.target.value })}
              className="w-full mt-1 px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="">Khong co (Bo phan goc)</option>
              {departments.filter(d => d.id !== editingDept?.id).map(dept => (
                <option key={dept.id} value={dept.id}>{dept.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-500 uppercase">Quan ly bo phan</label>
            <select
              value={formData.managerId}
              onChange={(e) => setFormData({ ...formData, managerId: e.target.value })}
              className="w-full mt-1 px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="">Chon quan ly</option>
              {users.filter(u => u.role === 'MANAGER').map(user => (
                <option key={user.id} value={user.id}>{user.name} ({user.email})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-500 uppercase">Mau sac</label>
            <div className="flex gap-2 mt-2 flex-wrap">
              {colorOptions.map(color => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setFormData({ ...formData, color })}
                  className={`w-8 h-8 rounded-full transition-all ${formData.color === color ? 'ring-2 ring-offset-2 ring-slate-400 scale-110' : 'hover:scale-110'}`}
                  style={{ backgroundColor: color }}
                >
                  {formData.color === color && <Check size={14} className="text-white mx-auto" />}
                </button>
              ))}
            </div>
          </div>

          {editingDept && (
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="w-4 h-4 rounded"
              />
              <label htmlFor="isActive" className="text-sm font-medium text-slate-700">Bo phan hoat dong</label>
            </div>
          )}

          <button
            onClick={handleCreateOrUpdate}
            disabled={!formData.name}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white py-3 rounded-xl font-bold transition-all"
          >
            {editingDept ? 'Cap nhat' : 'Tao bo phan'}
          </button>
        </div>
      </Modal>

      {/* Detail Modal */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        title={detailDept?.name || 'Chi tiet bo phan'}
      >
        {detailData ? (
          <div className="space-y-6">
            {/* Info */}
            <div className="p-4 bg-slate-50 rounded-2xl">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-xl" style={{ backgroundColor: `${detailData.color}20` }}>
                  <Building2 size={20} style={{ color: detailData.color }} />
                </div>
                <div>
                  <h4 className="font-bold text-slate-800">{detailData.name}</h4>
                  {detailData.code && <span className="text-xs text-slate-400 uppercase">{detailData.code}</span>}
                </div>
              </div>
              <p className="text-sm text-slate-600">{detailData.description || 'Khong co mo ta'}</p>
              {detailData.parentName && (
                <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
                  <FolderOpen size={12} /> Thuoc bo phan: {detailData.parentName}
                </p>
              )}
            </div>

            {/* Manager */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h5 className="text-xs font-bold text-slate-400 uppercase">Quan ly bo phan</h5>
                <button
                  onClick={() => {
                    setSelectedManagerId(detailData.manager?.id || '');
                    setIsChangingManager(true);
                  }}
                  className="text-xs text-blue-600 hover:underline"
                >
                  Thay doi
                </button>
              </div>
              {isChangingManager ? (
                <div className="space-y-2">
                  <select
                    value={selectedManagerId}
                    onChange={(e) => setSelectedManagerId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                  >
                    <option value="">Chon quan ly moi</option>
                    {users
                      .filter(u => (u.role === 'MANAGER' || u.role === 'ADMIN'))
                      .map(user => (
                        <option key={user.id} value={user.id}>{user.name} ({user.email})</option>
                      ))
                    }
                  </select>
                  <div className="flex gap-2">
                    <button
                      onClick={async () => {
                        if (!selectedManagerId) {
                          alert('Vui long chon nguoi quan ly moi');
                          return;
                        }
                        try {
                          await departmentsApi.update(detailData.id, { managerId: selectedManagerId });
                          // Refresh detail data
                          const updated = await departmentsApi.getById(detailData.id);
                          setDetailData(updated);
                          // Update departments list
                          setDepartments(departments.map(d => d.id === detailData.id ? { ...d, managerId: selectedManagerId } : d));
                          setIsChangingManager(false);
                          alert('Cap nhat quan ly thanh cong!');
                        } catch (err) {
                          console.error('Update manager error:', err);
                          alert('Cap nhat that bai!');
                        }
                      }}
                      className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium"
                    >
                      Luu
                    </button>
                    <button
                      onClick={() => setIsChangingManager(false)}
                      className="px-4 py-2 border border-slate-200 rounded-lg text-sm"
                    >
                      Huy
                    </button>
                  </div>
                </div>
              ) : detailData.manager ? (
                <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl">
                  <img src={detailData.manager.avatar} className="w-10 h-10 rounded-xl object-cover" alt="" />
                  <div>
                    <p className="font-bold text-slate-800 text-sm">{detailData.manager.name}</p>
                    <p className="text-xs text-slate-500">{detailData.manager.email}</p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-400">Chua co quan ly</p>
              )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 bg-slate-50 rounded-xl text-center">
                <Users size={20} className="mx-auto text-blue-500 mb-1" />
                <p className="text-2xl font-black text-slate-800">{detailData.memberCount}</p>
                <p className="text-xs text-slate-500">Nhan vien</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl text-center">
                <FolderKanban size={20} className="mx-auto text-amber-500 mb-1" />
                <p className="text-2xl font-black text-slate-800">{detailData.projectCount}</p>
                <p className="text-xs text-slate-500">Du an</p>
              </div>
            </div>

            {/* Members */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h5 className="text-xs font-bold text-slate-400 uppercase">
                  Danh sach nhan vien ({detailData.members?.length || 0})
                </h5>
                <button
                  onClick={() => setIsAddingMember(true)}
                  className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                >
                  <Plus size={14} /> Them nhan vien
                </button>
              </div>

              {isAddingMember && (
                <div className="mb-3 p-3 bg-blue-50 rounded-xl">
                  <select
                    value={selectedMemberId}
                    onChange={(e) => setSelectedMemberId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm mb-2"
                  >
                    <option value="">Chon nhan vien</option>
                    {users
                      .filter(u => {
                        // Lọc: không phải ADMIN/MANAGER
                        if (u.role === 'ADMIN' || u.role === 'MANAGER') return false;
                        // Chỉ hiển thị user chưa thuộc bộ phận nào
                        return !u.departmentId;
                      })
                      .map(user => (
                        <option key={user.id} value={user.id}>{user.name} ({user.email})</option>
                      ))
                    }
                  </select>
                  <div className="flex gap-2">
                    <button
                      onClick={async () => {
                        if (!selectedMemberId) {
                          alert('Vui long chon nhan vien');
                          return;
                        }
                        try {
                          await departmentsApi.assignMember(detailData.id, selectedMemberId);
                          // Refresh detail data
                          const updated = await departmentsApi.getById(detailData.id);
                          setDetailData(updated);
                          // Update users list
                          const updatedUser = users.find(u => u.id === selectedMemberId);
                          if (updatedUser) {
                            setUsers(users.map(u => u.id === selectedMemberId ? { ...u, departmentId: detailData.id } : u));
                          }
                          setIsAddingMember(false);
                          setSelectedMemberId('');
                          alert('Them nhan vien thanh cong!');
                        } catch (err) {
                          console.error('Add member error:', err);
                          alert('Them nhan vien that bai!');
                        }
                      }}
                      className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium"
                    >
                      Them
                    </button>
                    <button
                      onClick={() => {
                        setIsAddingMember(false);
                        setSelectedMemberId('');
                      }}
                      className="px-4 py-2 border border-slate-200 rounded-lg text-sm"
                    >
                      Huy
                    </button>
                  </div>
                </div>
              )}
              {detailData.members && detailData.members.length > 0 ? (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {detailData.members.map(member => (
                    <div key={member.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                      <div className="flex items-center gap-3">
                        <img src={member.avatar} className="w-8 h-8 rounded-lg object-cover" alt="" />
                        <div>
                          <p className="font-bold text-slate-800 text-sm">{member.name}</p>
                          <p className="text-xs text-slate-400">{member.email}</p>
                        </div>
                      </div>
                      <span className={`text-[10px] font-black px-2 py-1 rounded uppercase ${
                        member.role === 'ADMIN' ? 'bg-blue-100 text-blue-600' :
                        member.role === 'MANAGER' ? 'bg-amber-100 text-amber-600' :
                        'bg-slate-200 text-slate-600'
                      }`}>
                        {member.role}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400 text-center py-4">Chua co nhan vien</p>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
            <p className="text-slate-500 mt-2">Dang tai...</p>
          </div>
        )}
      </Modal>
    </div>
  );
};
