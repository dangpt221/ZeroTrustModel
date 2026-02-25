
import React, { useState } from 'react';
import { MOCK_USERS } from '../../mockData';
import { StaffTable } from '../../components/Manager/StaffTable';
import { StaffActionModal } from '../../components/Manager/StaffActionModal';
import { User } from '../../types';
import { Search, UserPlus, Filter, FileDown } from 'lucide-react';

export const StaffManagement: React.FC = () => {
  const staff = MOCK_USERS.filter(u => u.role !== 'ADMIN');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const handleAction = (user: User, action: string) => {
    if (action === 'VIEW_DETAILS') {
      setSelectedUser(user);
      setIsModalOpen(true);
    } else {
      alert(`Đã gửi yêu cầu ${action} cho user ${user.name} tới hệ thống SOC.`);
    }
  };

  const filteredStaff = staff.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight uppercase italic text-sky-600">Quản lý Staff bộ phận</h2>
          <p className="text-slate-500 text-sm font-medium">Giám sát và kiểm soát bảo mật cho nhân sự thuộc quyền quản lý</p>
        </div>
        <div className="flex gap-3">
          <button className="bg-white border border-slate-200 text-slate-600 px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-slate-50 transition-all shadow-sm">
            <FileDown size={18} /> Export báo cáo
          </button>
          <button className="bg-sky-600 text-white px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-sky-700 transition-all shadow-lg shadow-sky-500/20">
            <UserPlus size={18} /> Thêm nhân viên
          </button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-sky-500 transition-colors" size={18} />
          <input 
            type="text" 
            placeholder="Tìm kiếm theo tên, email hoặc vị trí..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-2xl py-3.5 pl-12 pr-4 focus:ring-2 focus:ring-sky-500/20 outline-none transition-all shadow-sm font-medium text-sm"
          />
        </div>
        <button className="bg-white border border-slate-200 text-slate-600 px-6 py-2 rounded-2xl font-bold text-sm flex items-center gap-2 hover:bg-slate-50 transition-all">
          <Filter size={18} /> Bộ lọc
        </button>
      </div>

      <StaffTable staff={filteredStaff} onAction={handleAction} />

      <StaffActionModal 
        user={selectedUser} 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    </div>
  );
};
