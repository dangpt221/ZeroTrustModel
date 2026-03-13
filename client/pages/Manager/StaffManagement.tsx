
import React, { useState, useEffect } from 'react';
import { usersApi, departmentsApi } from '../../api';
import { User, UserRole } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { usePermission } from '../../hooks/usePermission';
import { StaffActionModal } from '../../components/Manager/StaffActionModal';
import { Modal } from '../../components/Admin/Modal';
import {
  Search,
  Filter,
  FileDown,
  Lock,
  Unlock,
  Shield,
  Edit2,
  Smartphone,
  Monitor
} from 'lucide-react';

export const StaffManagement: React.FC = () => {
  const { user: currentUser } = useAuth();
  const { isAdmin, isManager } = usePermission();
  const [staff, setStaff] = useState<User[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filterRole, setFilterRole] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterDepartment, setFilterDepartment] = useState<string>('ALL');
  const [selectedStaff, setSelectedStaff] = useState<User | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editFormData, setEditFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'STAFF',
    department: '',
    mfaEnabled: false
  });

  useEffect(() => {
    const fetchStaff = async () => {
      try {
        let data;
        // Manager gets team members, Admin gets all users
        if (isAdmin) {
          data = await usersApi.getAll();
          data = (data || []).filter((u: User) => u.role !== UserRole.ADMIN);
        } else {
          data = await usersApi.getTeamMembers();
        }
        setStaff(data || []);
      } catch (error) {
        console.error('Error fetching staff:', error);
      } finally {
        setLoading(false);
      }
    };
    const fetchDepartments = async () => {
      try {
        const data = await departmentsApi.getAll();
        setDepartments(data || []);
      } catch (error) {
        console.error('Error fetching departments:', error);
      }
    };
    fetchStaff();
    fetchDepartments();
    const interval = setInterval(fetchStaff, 60000); // Refresh online status every 60s
    return () => clearInterval(interval);
  }, [isAdmin, isManager]);

  // Manager's department ID (from current user)
  const managerDepartmentId = currentUser?.departmentId;

  // Filter staff - Manager can ONLY see staff in their department
  const filteredStaff = staff.filter(s => {
    const matchSearch =
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchRole = filterRole === 'ALL' || s.role === filterRole;
    const matchStatus = filterStatus === 'ALL' || s.status === filterStatus;

    // Manager can only see staff in their department (not allow ALL)
    let matchDept = true;
    if (isManager) {
      // Always filter by manager's department
      matchDept = s.departmentId === managerDepartmentId;
    } else if (!isAdmin) {
      // For non-admin/non-manager, apply department filter
      matchDept = filterDepartment === 'ALL' || s.departmentId === filterDepartment;
    } else {
      // Admin can see all
      matchDept = filterDepartment === 'ALL' || s.departmentId === filterDepartment;
    }

    return matchSearch && matchRole && matchStatus && matchDept;
  });

  const handleViewDetails = (user: User) => {
    setSelectedStaff(user);
    setIsDetailModalOpen(true);
  };

  const handleToggleStatus = async (user: User) => {
    const nextStatus = user.status === 'ACTIVE' ? 'LOCKED' : 'ACTIVE';
    try {
      let updated;
      if (isAdmin) {
        updated = await usersApi.lock(user.id, nextStatus);
      } else {
        updated = await usersApi.lockTeamMember(user.id, nextStatus);
      }
      setStaff(prev => prev.map(u => (u.id === user.id ? updated : u)));
    } catch (err) {
      console.error('Toggle status error:', err);
      alert('Bạn không có quyền thực hiện thao tác này. Liên hệ Admin.');
    }
  };

  const handleToggleMfa = async (user: User) => {
    const newState = !user.mfaEnabled;
    try {
      let updated;
      if (isAdmin) {
        updated = await usersApi.toggleMfa(user.id, newState);
      } else {
        updated = await usersApi.updateTeamMember(user.id, { mfaEnabled: newState });
      }
      setStaff(prev => prev.map(u => (u.id === user.id ? updated : u)));
      alert(`Đã ${newState ? 'Bật' : 'Tắt'} bắt buộc OTP cho ${updated.name}.`);
    } catch (err) {
      console.error('Toggle MFA error:', err);
      alert('Bạn không có quyền thực hiện thao tác này. Liên hệ Admin.');
    }
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setEditFormData({
      name: user.name,
      email: user.email,
      password: '',
      role: user.role,
      department: user.department || '',
      mfaEnabled: user.mfaEnabled
    });
    setIsEditModalOpen(true);
  };

  const handleUpdateUser = async () => {
    if (!editingUser) return;
    try {
      const updateData: any = {
        name: editFormData.name,
        role: editFormData.role,
        department: editFormData.department,
        mfaEnabled: editFormData.mfaEnabled
      };
      if (editFormData.password) updateData.password = editFormData.password;
      const updated = await usersApi.update(editingUser.id, updateData);
      setStaff(prev => prev.map(u => (u.id === editingUser.id ? { ...u, ...updated } : u)));
      setIsEditModalOpen(false);
      setEditingUser(null);
      setEditFormData({ name: '', email: '', password: '', role: 'STAFF', department: '', mfaEnabled: false });
      alert('Cập nhật thành công!');
    } catch (err) {
      console.error('Update user error:', err);
      alert('Cập nhật thất bại. Liên hệ Admin nếu cần.');
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa nhân viên này?')) return;
    try {
      await usersApi.delete(id);
      setStaff(prev => prev.filter(u => u.id !== id));
      setIsDetailModalOpen(false);
      setSelectedStaff(null);
      alert('Xóa nhân viên thành công!');
    } catch (err) {
      console.error('Delete user error:', err);
      alert('Xóa thất bại. Liên hệ Admin.');
    }
  };

  const handleExportExcel = () => {
    const headers = ['Tên', 'Email', 'Vai trò', 'Bộ phận', 'Trust Score', 'Thiết bị', 'Trạng thái', 'MFA'];
    const rows = filteredStaff.map(u =>
      [u.name, u.email, u.role, u.department || '-', `${u.trustScore}%`, u.device || '-', u.status, u.mfaEnabled ? 'Có' : 'Không'].join(',')
    );
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `nhan-vien-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const clearFilters = () => {
    setFilterRole('ALL');
    setFilterStatus('ALL');
    setFilterDepartment('ALL');
    setSearchTerm('');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      <div>
        <h2 className="text-2xl font-black text-slate-800 uppercase italic">Quản lý nhân sự</h2>
        <p className="text-slate-500 text-sm">Theo dõi và quản lý hoạt động của nhân viên trong bộ phận</p>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
          <input
            type="text"
            placeholder="Tìm nhân viên..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-2xl py-3.5 pl-12 pr-4 focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm font-medium"
          />
        </div>
        <button
          onClick={() => setIsFilterOpen(!isFilterOpen)}
          className={`bg-white border px-6 py-2 rounded-2xl font-bold text-sm flex items-center gap-2 transition-all ${isFilterOpen ? 'border-blue-500 text-blue-600' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
        >
          <Filter size={18} /> Lọc
          {(filterRole !== 'ALL' || filterStatus !== 'ALL' || filterDepartment !== 'ALL') && (
            <span className="w-2 h-2 bg-blue-500 rounded-full" />
          )}
        </button>
        <button
          onClick={handleExportExcel}
          className="bg-white border border-slate-200 text-slate-600 px-6 py-2 rounded-2xl font-bold text-sm flex items-center gap-2 hover:bg-slate-50 transition-all"
        >
          <FileDown size={18} /> Xuất Excel
        </button>
      </div>

      {isFilterOpen && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-lg animate-in slide-in-from-top-2">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-bold text-slate-800">Lọc nhân viên</h4>
            <button onClick={clearFilters} className="text-sm text-blue-600 hover:underline">
              Xóa bộ lọc
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">Vai trò</label>
              <select
                value={filterRole}
                onChange={e => setFilterRole(e.target.value)}
                className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl text-sm"
              >
                <option value="ALL">Tất cả</option>
                <option value="MANAGER">Manager</option>
                <option value="STAFF">Staff</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">Trạng thái</label>
              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
                className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl text-sm"
              >
                <option value="ALL">Tất cả</option>
                <option value="ACTIVE">Hoạt động</option>
                <option value="LOCKED">Bị khóa</option>
                <option value="PENDING">Chờ duyệt</option>
              </select>
            </div>
            {!isManager && (
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">Bộ phận</label>
              <select
                value={filterDepartment}
                onChange={e => setFilterDepartment(e.target.value)}
                className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl text-sm"
              >
                <option value="ALL">Tất cả</option>
                {departments.map(dept => (
                  <option key={dept.id} value={dept.name || dept.id}>
                    {dept.name}
                  </option>
                ))}
              </select>
            </div>
            )}
          </div>
        </div>
      )}

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
                  <td colSpan={6} className="px-8 py-12 text-center text-slate-400">
                    Đang tải...
                  </td>
                </tr>
              ) : filteredStaff.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-8 py-12 text-center text-slate-400">
                    Không tìm thấy nhân viên
                  </td>
                </tr>
              ) : (
                filteredStaff.map(user => (
                  <tr key={user.id} className="hover:bg-slate-50/30 transition-colors group">
                    <td className="px-8 py-5">
                      <div
                        className="flex items-center gap-4 cursor-pointer"
                        onClick={() => handleViewDetails(user)}
                      >
                        <img
                          src={user.avatar}
                          className="w-11 h-11 rounded-2xl object-cover ring-2 ring-white shadow-sm"
                          alt=""
                        />
                        <div>
                          <p className="text-sm font-bold text-slate-800">{user.name}</p>
                          <p className="text-[11px] text-slate-400 font-medium">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <span
                        className={`text-[10px] font-black px-2 py-0.5 rounded uppercase border ${user.role === 'MANAGER'
                            ? 'bg-amber-50 text-amber-600 border-amber-100'
                            : 'bg-slate-50 text-slate-500 border-slate-200'
                          }`}
                      >
                        {user.role}
                      </span>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${user.trustScore > 80 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                            style={{ width: `${user.trustScore}%` }}
                          />
                        </div>
                        <span className="text-xs font-bold text-slate-600">{user.trustScore}%</span>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-2 text-slate-600">
                        {/điện thoại|iphone|android/i.test(user.device || '') ? (
                          <Smartphone size={16} className="text-slate-400 shrink-0" />
                        ) : (
                          <Monitor size={16} className="text-slate-400 shrink-0" />
                        )}
                        <span className="text-xs font-medium">{user.device || 'Chưa xác định'}</span>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      {user.status === 'ACTIVE' ? (
                        <span
                          className={`inline-flex items-center gap-1.5 text-[10px] font-black px-3 py-1 rounded-full ${user.isOnline
                              ? 'bg-emerald-500/10 text-emerald-600'
                              : 'bg-slate-100 text-slate-500'
                            }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${user.isOnline ? 'bg-emerald-500' : 'bg-slate-400'
                              }`}
                          />
                          {user.isOnline ? 'Online' : 'Offline'}
                        </span>
                      ) : (
                        <span className="text-[10px] font-black px-3 py-1 rounded-full bg-rose-500/10 text-rose-600">
                          {user.status === 'LOCKED' ? 'Bị khóa' : 'Chờ duyệt'}
                        </span>
                      )}
                    </td>
                    <td className="px-8 py-5 text-right">
                      <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleViewDetails(user)}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                          title="Xem chi tiết"
                        >
                          <Shield size={18} />
                        </button>
                        <button
                          onClick={() => handleToggleMfa(user)}
                          className={`p-2 rounded-xl transition-all ${user.mfaEnabled
                              ? 'text-emerald-500 hover:bg-emerald-50'
                              : 'text-amber-500 hover:bg-amber-50'
                            }`}
                          title={user.mfaEnabled ? 'MFA đã bật' : 'Bật MFA'}
                        >
                          <Smartphone size={18} />
                        </button>
                        <button
                          onClick={() => handleEditUser(user)}
                          className="p-2 text-blue-500 hover:bg-blue-50 rounded-xl transition-all"
                          title="Chỉnh sửa"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => handleToggleStatus(user)}
                          className={`p-2 rounded-xl transition-all ${user.status === 'ACTIVE'
                              ? 'text-amber-500 hover:bg-amber-50'
                              : 'text-emerald-500 hover:bg-emerald-50'
                            }`}
                          title={user.status === 'ACTIVE' ? 'Khóa' : 'Mở khóa'}
                        >
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

      <StaffActionModal
        user={selectedStaff}
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedStaff(null);
        }}
        onDelete={selectedStaff ? () => handleDeleteUser(selectedStaff.id) : undefined}
      />

      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingUser(null);
        }}
        title="Chỉnh sửa nhân viên"
        size="lg"
      >
        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase">Họ và tên</label>
            <input
              type="text"
              value={editFormData.name}
              onChange={e => setEditFormData({ ...editFormData, name: e.target.value })}
              className="w-full mt-1 px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="Nguyễn Văn A"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase">Email</label>
            <input
              type="email"
              value={editFormData.email}
              disabled
              className="w-full mt-1 px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 text-slate-500"
            />
            <p className="text-xs text-slate-400 mt-1">Email không thể thay đổi</p>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase">Mật khẩu mới (để trống nếu không đổi)</label>
            <input
              type="password"
              value={editFormData.password}
              onChange={e => setEditFormData({ ...editFormData, password: e.target.value })}
              className="w-full mt-1 px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="******"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">Vai trò</label>
              <select
                value={editFormData.role}
                onChange={e => setEditFormData({ ...editFormData, role: e.target.value })}
                className="w-full mt-1 px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="STAFF">Staff</option>
                <option value="MANAGER">Manager</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">Bộ phận</label>
              <select
                value={editFormData.department}
                onChange={e => setEditFormData({ ...editFormData, department: e.target.value })}
                className="w-full mt-1 px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="">Chọn bộ phận</option>
                {departments.map(dept => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
            <div>
              <p className="text-sm font-bold text-slate-700">Bắt buộc MFA</p>
              <p className="text-xs text-slate-400">Yêu cầu xác thực 2 bước</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={editFormData.mfaEnabled}
                onChange={() => setEditFormData({ ...editFormData, mfaEnabled: !editFormData.mfaEnabled })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600" />
            </label>
          </div>
          <button
            onClick={handleUpdateUser}
            disabled={!editFormData.name}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white py-3 rounded-xl font-bold transition-all"
          >
            Lưu thay đổi
          </button>
        </div>
      </Modal>
    </div>
  );
};
