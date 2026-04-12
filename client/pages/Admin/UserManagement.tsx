
import {
  Check,
  Edit2,
  Filter,
  Lock,
  Monitor,
  Search,
  Smartphone,
  Trash2,
  Unlock,
  UserMinus,
  UserPlus
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { departmentsApi, usersApi } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { Modal } from '../../components/Admin/Modal';
import { User, UserRole } from '../../types';

export const UserManagement: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filterRole, setFilterRole] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterDepartment, setFilterDepartment] = useState<string>('ALL');
  const [departments, setDepartments] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'STAFF',
    department: '',
    mfaEnabled: false
  });
  const [editFormData, setEditFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'STAFF',
    department: '',
    mfaEnabled: false
  });

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const data = await usersApi.getAll();
        setUsers(data || []);
      } catch (err) {
        console.error('Fetch admin users error:', err);
      }
    };

    const fetchDepartments = async () => {
      try {
        const data = await departmentsApi.getAll();
        setDepartments(data || []);
      } catch (err) {
        console.error('Fetch departments error:', err);
      }
    };

    fetchUsers();
    fetchDepartments();
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    const socket = io(window.location.origin, {
      transports: ['polling', 'websocket'],
      auth: { userId: currentUser.id, userName: currentUser.name },
      query: { userId: currentUser.id, userName: currentUser.name },
      withCredentials: false
    });

    socket.on('initial_online_users', (userIds: string[]) => {
      setOnlineUsers(new Set(userIds.map(String)));
    });

    socket.on('user_status_changed', ({ userId, isOnline }: any) => {
      setOnlineUsers(prev => {
        const next = new Set(prev);
        if (isOnline) next.add(String(userId));
        else next.delete(String(userId));
        return next;
      });
    });

    return () => {
      socket.disconnect();
    };
  }, [currentUser]);

  const filteredUsers = users.filter(u => {
    const matchSearch = u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.department && u.department.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchRole = filterRole === 'ALL' || u.role === filterRole;
    const matchStatus = filterStatus === 'ALL' || u.status === filterStatus;
    const matchDepartment = filterDepartment === 'ALL' || u.departmentId === filterDepartment;
    return matchSearch && matchRole && matchStatus && matchDepartment;
  });

  const handleCreateUser = async () => {
    try {
      const newUser = await usersApi.create({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        role: formData.role,
        ...(formData.department ? { departmentId: formData.department } : {}),
        mfaEnabled: formData.mfaEnabled
      });
      setUsers([...users, { ...newUser, id: newUser.id, status: 'PENDING', trustScore: 50, device: 'Unknown', avatar: 'https://picsum.photos/seed/default/200' }]);
      setIsModalOpen(false);
      setFormData({ name: '', email: '', password: '', role: 'STAFF', department: '', mfaEnabled: false });
      alert('Tạo người dùng thành công!');
    } catch (err) {
      console.error('Create user error:', err);
      alert('Tạo người dùng thất bại!');
    }
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setEditFormData({
      name: user.name,
      email: user.email,
      password: '',
      role: user.role,
      department: user.departmentId || '',
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
        ...(editFormData.department ? { departmentId: editFormData.department } : {}),
        mfaEnabled: editFormData.mfaEnabled
      };
      // Only include password if provided
      if (editFormData.password) {
        updateData.password = editFormData.password;
      }

      const updated = await usersApi.update(editingUser.id, updateData);
      setUsers(prev => prev.map(u => (u.id === editingUser.id ? { ...u, ...updated } : u)));
      setIsEditModalOpen(false);
      setEditingUser(null);
      setEditFormData({ name: '', email: '', password: '', role: 'STAFF', department: '', mfaEnabled: false });
      alert('Cập nhật người dùng thành công!');
    } catch (err) {
      console.error('Update user error:', err);
      alert('Cập nhật người dùng thất bại!');
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (confirm('Bạn có chắc chắn muốn xóa người dùng này?')) {
      try {
        await usersApi.delete(id);
        setUsers(users.filter(u => u.id !== id));
        alert('Xóa người dùng thành công!');
      } catch (err) {
        console.error('Delete user error:', err);
        alert('Xóa người dùng thất bại!');
      }
    }
  };

  const clearFilters = () => {
    setFilterRole('ALL');
    setFilterStatus('ALL');
    setFilterDepartment('ALL');
    setSearchTerm('');
  };

  const toggleStatus = async (id: string) => {
    const target = users.find(u => u.id === id);
    if (!target) return;
    const nextStatus = target.status === 'ACTIVE' ? 'LOCKED' : 'ACTIVE';

    try {
      const updated = await usersApi.lock(id, nextStatus);
      setUsers(prev => prev.map(u => (u.id === id ? updated : u)));
    } catch (err) {
      console.error('Toggle status error:', err);
    }
  };

  const toggleMFA = async (id: string) => {
    const target = users.find(u => u.id === id);
    if (!target) return;
    const newState = !target.mfaEnabled;

    try {
      const updated = await usersApi.toggleMfa(id, newState);
      setUsers(prev => prev.map(u => (u.id === id ? updated : u)));
      alert(`Đã ${newState ? 'Bật' : 'Tắt'} bắt buộc OTP cho người dùng ${updated.name}.`);
    } catch (err) {
      console.error('Toggle MFA error:', err);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await usersApi.approve(id);
      setUsers(prev => prev.map(u => (u.id === id ? { ...u, status: 'ACTIVE' } : u)));
      alert('Phê duyệt người dùng thành công!');
    } catch (err) {
      console.error('Approve user error:', err);
      alert('Phê duyệt người dùng thất bại!');
    }
  };

  const handleReject = async (id: string) => {
    if (confirm('Bạn có chắc chắn muốn TỪ CHỐI và XÓA yêu cầu đăng ký này?')) {
      try {
        await usersApi.reject(id);
        setUsers(prev => prev.filter(u => u.id !== id));
        alert('Đã từ chối và xóa người dùng.');
      } catch (err) {
        console.error('Reject user error:', err);
        alert('Thao tác thất bại!');
      }
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative">
          <div className="absolute -left-4 top-0 w-1.5 h-full bg-blue-600 rounded-full shadow-[0_0_15px_rgba(37,99,235,0.5)]"></div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight italic uppercase">QUẢN LÝ NHÂN SỰ</h2>
          <p className="text-slate-500 font-medium mt-1">Phê duyệt, phân quyền và quản lý tài khoản người dùng</p>
        </div>
        
        <button onClick={() => setIsModalOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-blue-500/20 flex items-center gap-2 transition-all active:scale-95">
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
        <button onClick={() => setIsFilterOpen(!isFilterOpen)} className={`bg-white border px-5 py-2 rounded-2xl font-bold text-sm flex items-center gap-2 transition-all ${isFilterOpen ? 'border-blue-500 text-blue-600' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
          <Filter size={18} /> Bộ lọc {(filterRole !== 'ALL' || filterStatus !== 'ALL' || filterDepartment !== 'ALL') && <span className="w-2 h-2 bg-blue-500 rounded-full"></span>}
        </button>
      </div>

      {/* Filter Panel */}
      {isFilterOpen && (
        <div className="bg-white p-4 md:p-6 rounded-2xl border border-slate-200 shadow-lg animate-in slide-in-from-top-2">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-bold text-slate-800">Lọc người dùng</h4>
            <button onClick={clearFilters} className="text-sm text-blue-600 hover:underline">Xóa bộ lọc</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">Vai trò</label>
              <select value={filterRole} onChange={(e) => setFilterRole(e.target.value)} className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl text-sm">
                <option value="ALL">Tất cả</option>
                <option value="STAFF">Staff</option>
                <option value="MANAGER">Manager</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">Trạng thái</label>
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl text-sm">
                <option value="ALL">Tất cả</option>
                <option value="ACTIVE">Hoạt động</option>
                <option value="LOCKED">Bị khóa</option>
                <option value="PENDING">Chờ duyệt</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">Bộ phận</label>
              <select
                value={filterDepartment}
                onChange={(e) => setFilterDepartment(e.target.value)}
                className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl text-sm"
              >
                <option value="ALL">Tất cả</option>
                {departments.map(dept => (
                  <option key={dept.id} value={dept.id}>{dept.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-[32px] shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[1000px]">
            <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 text-[10px] font-black uppercase tracking-widest">
              <tr>
                <th className="px-4 md:px-8 py-4 md:py-6">Nhân sự</th>
                <th className="px-4 md:px-8 py-4 md:py-6">Vai trò / MFA</th>
                <th className="px-4 md:px-8 py-4 md:py-6">Trust Score</th>
                <th className="px-4 md:px-8 py-4 md:py-6">Bộ phận</th>
                <th className="px-4 md:px-8 py-4 md:py-6">Trạng thái</th>
                <th className="px-4 md:px-8 py-4 md:py-6 text-right">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-blue-50/30 transition-colors group">
                  <td className="px-4 md:px-8 py-5">
                    <div className="flex items-center gap-4">
                      <div className="relative shrink-0">
                        <img src={user.avatar} className="w-11 h-11 rounded-2xl object-cover ring-2 ring-white shadow-sm" />
                        <div className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 border-2 border-white rounded-full ${onlineUsers.has(user.id) ? 'bg-green-500' : 'bg-slate-300'}`} title={onlineUsers.has(user.id) ? 'Đang hoạt động' : 'Ngoại tuyến'}></div>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800">{user.name}</p>
                        <p className="text-[11px] text-slate-400 font-medium">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 md:px-8 py-5">
                    <div className="flex flex-col gap-1">
                      <span className={`w-fit text-[10px] font-black px-2 py-0.5 rounded uppercase border ${user.role === UserRole.ADMIN ? 'bg-blue-50 text-blue-600 border-blue-100' :
                        user.role === UserRole.MANAGER ? 'bg-amber-50 text-amber-600 border-amber-100' :
                          'bg-slate-50 text-slate-500 border-slate-200'
                        }`}>
                        {user.role}
                      </span>
                      <button
                        onClick={() => toggleMFA(user.id)}
                        className={`w-fit shrink-0 whitespace-nowrap flex items-center gap-1 text-[9px] font-black uppercase tracking-tighter py-0.5 px-1.5 rounded border transition-all ${user.mfaEnabled ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-100 text-slate-400 border-slate-200'
                          }`}
                      >
                        <Smartphone size={10} /> {user.mfaEnabled ? 'MFA ACTIVE' : 'FORCE MFA'}
                      </button>
                    </div>
                  </td>
                  <td className="px-4 md:px-8 py-5">
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between text-[10px] font-black uppercase">
                        <span className={user.trustScore > 80 ? 'text-emerald-500' : 'text-amber-500'}>{user.trustScore}% Verified</span>
                      </div>
                      <div className="w-28 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-1000 ${user.trustScore > 80 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                          style={{ width: `${user.trustScore}%` }}
                        ></div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 md:px-8 py-5">
                    <span className="text-[11px] font-medium text-slate-600">
                      {user.department || 'Chưa phân công'}
                    </span>
                  </td>
                  <td className="px-4 md:px-8 py-5">
                    <span className={`text-[10px] font-black px-3 py-1 rounded-full ${user.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'
                      }`}>
                      {user.status}
                    </span>
                  </td>
                  <td className="px-4 md:px-8 py-5 text-right">
                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {user.status === 'PENDING' && (
                        <>
                          <button
                            onClick={() => handleApprove(user.id)}
                            className="p-2 text-emerald-500 hover:bg-emerald-50 rounded-xl transition-all"
                            title="Phê duyệt"
                          >
                            <Check size={18} />
                          </button>
                          <button
                            onClick={() => handleReject(user.id)}
                            className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                            title="Từ chối"
                          >
                            <UserMinus size={18} />
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => handleEditUser(user)}
                        className="p-2 text-blue-500 hover:bg-blue-50 rounded-xl transition-all"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        onClick={() => toggleStatus(user.id)}
                        className={`p-2 rounded-xl transition-all ${user.status === 'ACTIVE' ? 'text-amber-500 hover:bg-amber-50' : 'text-emerald-500 hover:bg-emerald-50'}`}
                      >
                        {user.status === 'ACTIVE' ? <Lock size={18} /> : <Unlock size={18} />}
                      </button>
                      <button onClick={() => handleDeleteUser(user.id)} className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-all">
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

      {/* Add User Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Thêm nhân sự mới">
        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase">Họ và tên</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full mt-1 px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="Nguyễn Văn A"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full mt-1 px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="user@company.com"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase">Mật khẩu</label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full mt-1 px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="******"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">Vai trò</label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="w-full mt-1 px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="STAFF">Staff - Nhân viên</option>
                <option value="MANAGER">Manager - Quản lý</option>
                <option value="ADMIN">Admin - Quản trị</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">Bộ phận</label>
              <select
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                className="w-full mt-1 px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="">Chọn bộ phận</option>
                {departments.map(dept => (
                  <option key={dept.id} value={dept.id}>{dept.name}</option>
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
                checked={formData.mfaEnabled}
                onChange={() => setFormData({ ...formData, mfaEnabled: !formData.mfaEnabled })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
          <button
            onClick={handleCreateUser}
            disabled={!formData.name || !formData.email}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white py-3 rounded-xl font-bold transition-all"
          >
            Tạo người dùng
          </button>
        </div>
      </Modal>

      {/* Edit User Modal */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Chỉnh sửa người dùng">
        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase">Họ và tên</label>
            <input
              type="text"
              value={editFormData.name}
              onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
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
              placeholder="user@company.com"
            />
            <p className="text-xs text-slate-400 mt-1">Email không thể thay đổi</p>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase">Mật khẩu mới (để trống nếu không đổi)</label>
            <input
              type="password"
              value={editFormData.password}
              onChange={(e) => setEditFormData({ ...editFormData, password: e.target.value })}
              className="w-full mt-1 px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="******"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">Vai trò</label>
              <select
                value={editFormData.role}
                onChange={(e) => setEditFormData({ ...editFormData, role: e.target.value })}
                className="w-full mt-1 px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="STAFF">Staff - Nhân viên</option>
                <option value="MANAGER">Manager - Quản lý</option>
                <option value="ADMIN">Admin - Quản trị</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">Bộ phận</label>
              <select
                value={editFormData.department}
                onChange={(e) => setEditFormData({ ...editFormData, department: e.target.value })}
                className="w-full mt-1 px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="">Chọn bộ phận</option>
                {departments.map(dept => (
                  <option key={dept.id} value={dept.id}>{dept.name}</option>
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
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
          <button
            onClick={handleUpdateUser}
            disabled={!editFormData.name}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white py-3 rounded-xl font-bold transition-all"
          >
            Lưu thay đổi
          </button>
        </div>
      </Modal>
    </div>
  );
};
