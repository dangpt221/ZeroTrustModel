
import React, { useEffect, useState } from 'react';
import { departmentsApi, usersApi } from '../../api';
import { Department, User } from '../../types';
import { Building2, Users, UserCheck, Plus, Trash2, Edit2 } from 'lucide-react';
import { Modal } from '../../components/Admin/Modal';

export const DepartmentManagement: React.FC = () => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [formData, setFormData] = useState({ name: '', description: '', managerId: '' });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [deptData, usersData] = await Promise.all([
          departmentsApi.getAll(),
          usersApi.getAll()
        ]);
        setDepartments(deptData || []);
        setUsers(usersData || []);
      } catch (error) {
        console.error('Error fetching departments:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleDelete = async (id: string) => {
    if (confirm('Bạn có chắc chắn muốn xóa bộ phận này?')) {
      try {
        await departmentsApi.update(id, { deleted: true });
        setDepartments(departments.filter(d => d.id !== id));
        alert('Xóa bộ phận thành công!');
      } catch (err) {
        console.error('Delete department error:', err);
        alert('Xóa bộ phận thất bại!');
      }
    }
  };

  const handleCreateOrUpdate = async () => {
    try {
      if (editingDept) {
        await departmentsApi.update(editingDept.id, formData);
        setDepartments(departments.map(d => d.id === editingDept.id ? { ...d, ...formData } : d));
        alert('Cập nhật bộ phận thành công!');
      } else {
        const created = await departmentsApi.create(formData);
        setDepartments([...departments, { ...created, id: created.id, memberCount: 0 }]);
        alert('Tạo bộ phận thành công!');
      }
      setIsModalOpen(false);
      setEditingDept(null);
      setFormData({ name: '', description: '', managerId: '' });
    } catch (err) {
      console.error('Save department error:', err);
      alert('Thao tác thất bại!');
    }
  };

  const openCreateModal = () => {
    setEditingDept(null);
    setFormData({ name: '', description: '', managerId: '' });
    setIsModalOpen(true);
  };

  const openEditModal = (dept: Department) => {
    setEditingDept(dept);
    setFormData({ name: dept.name, description: dept.description || '', managerId: dept.managerId });
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight uppercase italic">Cấu trúc tổ chức</h2>
          <p className="text-slate-500 text-sm font-medium">Quản lý các phòng ban và phân bổ nhân sự cốt lõi</p>
        </div>
        <button onClick={openCreateModal} className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-blue-500/20 active:scale-95 transition-all">
          <Plus size={18} /> Thêm bộ phận mới
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {departments.map(dept => {
          const manager = users.find(u => u.id === dept.managerId);
          return (
            <div key={dept.id} className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm hover:border-blue-200 transition-all group relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                <Building2 size={80} />
              </div>

              <div className="flex justify-between items-start mb-6">
                <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl">
                  <Building2 size={24} />
                </div>
                <button onClick={() => openEditModal(dept)} className="text-slate-300 hover:text-blue-600">
                  <Edit2 size={20} />
                </button>
              </div>

              <h3 className="text-xl font-black text-slate-800 mb-2">{dept.name}</h3>
              <p className="text-xs text-slate-400 font-medium leading-relaxed mb-6 line-clamp-2">{dept.description}</p>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl">
                  <div className="flex items-center gap-2 text-slate-500">
                    <Users size={16} />
                    <span className="text-[10px] font-black uppercase">Nhân sự</span>
                  </div>
                  <span className="text-sm font-black text-slate-800">{loading ? '...' : dept.memberCount} thành viên</span>
                </div>

                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-transparent group-hover:border-blue-100 transition-all">
                  <div className="flex items-center gap-2 text-slate-500">
                    <UserCheck size={16} />
                    <span className="text-[10px] font-black uppercase">Quản lý</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <img src={manager?.avatar || 'https://picsum.photos/seed/default/200'} className="w-5 h-5 rounded-full object-cover" />
                    <span className="text-xs font-bold text-blue-600">{manager?.name || 'N/A'}</span>
                  </div>
                </div>
              </div>

              <div className="mt-8 flex gap-2 opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0">
                <button className="flex-1 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 transition-colors">
                  Chi tiết
                </button>
                <button
                  onClick={() => handleDelete(dept.id)}
                  className="px-4 py-2 border border-slate-200 text-slate-400 rounded-xl hover:text-rose-500 hover:bg-rose-50 transition-all"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Department Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingDept ? 'Chỉnh sửa bộ phận' : 'Thêm bộ phận mới'}
      >
        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase">Tên bộ phận</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full mt-1 px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="Phòng Kỹ thuật"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase">Mô tả</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full mt-1 px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none resize-none"
              rows={3}
              placeholder="Mô tả bộ phận..."
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase">Quản lý</label>
            <select
              value={formData.managerId}
              onChange={(e) => setFormData({ ...formData, managerId: e.target.value })}
              className="w-full mt-1 px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="">Chọn quản lý</option>
              {users.map(user => (
                <option key={user.id} value={user.id}>{user.name}</option>
              ))}
            </select>
          </div>
          <button
            onClick={handleCreateOrUpdate}
            disabled={!formData.name}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white py-3 rounded-xl font-bold transition-all"
          >
            {editingDept ? 'Cập nhật' : 'Tạo bộ phận'}
          </button>
        </div>
      </Modal>
    </div>
  );
};
