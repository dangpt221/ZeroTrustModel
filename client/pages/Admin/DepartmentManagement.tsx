
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
    const dept = departments.find(d => d.id === id);
    const membersInDept = users.filter(u => u.departmentId === id);

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

  // Get available managers
  const availableManagers = users.filter(u => {
    if (!u.departmentId) return true;
    const dept = departments.find(d => d.id === u.departmentId);
    return dept?.managerId === u.id;
  });

  // Stats
  const totalMembers = users.length;
  const totalProjects = projects.length;

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight uppercase italic">Cau truc to chuc</h2>
          <p className="text-slate-500 text-sm font-medium">Quan ly cac phong ban va phan bo nhan su</p>
        </div>
        <div className="flex gap-3">
          <div className="bg-white px-4 py-2 rounded-xl border border-slate-200 flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Building2 size={16} className="text-blue-500" />
              <span className="text-sm font-medium">{departments.length} bo phan</span>
            </div>
            <div className="w-px h-4 bg-slate-200"></div>
            <div className="flex items-center gap-2">
              <Users size={16} className="text-emerald-500" />
              <span className="text-sm font-medium">{totalMembers} nhan vien</span>
            </div>
            <div className="w-px h-4 bg-slate-200"></div>
            <div className="flex items-center gap-2">
              <FolderKanban size={16} className="text-amber-500" />
              <span className="text-sm font-medium">{totalProjects} du an</span>
            </div>
          </div>
          <button onClick={openCreateModal} className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-blue-500/20 active:scale-95 transition-all">
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
              <div key={dept.id} className={`bg-white p-6 rounded-[32px] border shadow-sm hover:shadow-md transition-all group relative overflow-hidden ${dept.isActive === false ? 'opacity-60' : ''}`}>
                {/* Color bar */}
                <div className="absolute top-0 left-0 right-0 h-1" style={{ backgroundColor: dept.color || '#3B82F6' }}></div>

                <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                  <Building2 size={80} />
                </div>

                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-2xl" style={{ backgroundColor: `${dept.color || '#3B82F6'}20` }}>
                      <Building2 size={20} style={{ color: dept.color || '#3B82F6' }} />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-slate-800">{dept.name}</h3>
                      {dept.code && <span className="text-[10px] font-bold text-slate-400 uppercase">{dept.code}</span>}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => openEditModal(dept)} className="p-2 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all">
                      <Edit2 size={16} />
                    </button>
                    <button onClick={() => handleDelete(dept.id)} className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all">
                      <Trash2 size={16} />
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
                      <FolderKanban size={14} />
                      <span className="text-[10px] font-black uppercase">Du an</span>
                    </div>
                    <span className="text-sm font-bold text-slate-800">{projectCount}</span>
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
              {availableManagers.filter(u => u.id !== editingDept?.managerId || editingDept?.managerId === u.id).map(user => (
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
              <h5 className="text-xs font-bold text-slate-400 uppercase mb-3">Quan ly bo phan</h5>
              {detailData.manager ? (
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
              <h5 className="text-xs font-bold text-slate-400 uppercase mb-3">
                Danh sach nhan vien ({detailData.members?.length || 0})
              </h5>
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

            {/* Projects */}
            <div>
              <h5 className="text-xs font-bold text-slate-400 uppercase mb-3">
                Du an dang thuc hien ({detailData.projects?.length || 0})
              </h5>
              {detailData.projects && detailData.projects.length > 0 ? (
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {detailData.projects.map(project => (
                    <div key={project.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                      <div>
                        <p className="font-bold text-slate-800 text-sm">{project.title}</p>
                        <p className="text-xs text-slate-400">{project.status}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-blue-600">{project.progress}%</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400 text-center py-4">Khong co du an</p>
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
