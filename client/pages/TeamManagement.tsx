
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { teamsApi, usersApi } from '../api';
import {
  Users,
  Plus,
  UserPlus,
  Search,
  Shield,
  MoreVertical,
  CheckCircle2,
  X,
  LayoutGrid,
  Trash2
} from 'lucide-react';
import { Team, User } from '../types';

export const TeamManagement: React.FC = () => {
  const { user } = useAuth();
  const [teams, setTeams] = useState<Team[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTeam, setNewTeam] = useState({ name: '', description: '' });
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [openMenuTeamId, setOpenMenuTeamId] = useState<string | null>(null);

  useEffect(() => {
    fetchTeams();
    fetchUsers();
  }, []);

  const fetchTeams = async () => {
    const data = await teamsApi.getAll();
    setTeams(data || []);
  };

  const fetchUsers = async () => {
    const data = await usersApi.getList();
    setAllUsers(data || []);
  };

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    const created = await teamsApi.create(newTeam);
    fetchTeams();
    setIsModalOpen(false);
    setNewTeam({ name: '', description: '' });
  };

  const handleAddMember = async (userId: string) => {
    if (!selectedTeam) return;
    await teamsApi.addMember(selectedTeam.id, userId);
    fetchTeams();
    setIsAddMemberModalOpen(false);
  };

  const handleDeleteTeam = async (teamId: string) => {
    if (!teamId) return;
    if (!confirm('Bạn có chắc chắn muốn xóa đội ngũ này?')) return;
    try {
      await teamsApi.delete(teamId);
      setTeams(prev => prev.filter(t => t.id !== teamId));
    } catch (err) {
      console.error('Delete team error:', err);
      alert(err instanceof Error ? err.message : 'Xóa đội ngũ thất bại.');
    }
  };

  const filteredUsers = allUsers.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight italic uppercase">
            Quản lý <span className="text-blue-600">Nhóm & Đội ngũ</span>
          </h2>
          <p className="text-slate-500 text-sm mt-1 font-medium">Tạo nhóm dự án và phân bổ nhân sự theo vị trí công việc.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all"
        >
          <Plus size={18} /> Tạo nhóm mới
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {teams.map(team => (
          <div key={team.id} className="bg-white rounded-[40px] border border-slate-100 shadow-sm hover:shadow-xl transition-all p-8 flex flex-col h-full group relative overflow-visible">
            <div className="flex justify-between items-start mb-6">
              <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <LayoutGrid size={24} />
              </div>
              <div className="relative">
                <button
                  onClick={() => setOpenMenuTeamId(openMenuTeamId === team.id ? null : team.id)}
                  className="p-2 text-slate-300 hover:text-slate-600 rounded-xl transition-all"
                >
                  <MoreVertical size={20} />
                </button>
                {openMenuTeamId === team.id && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenMenuTeamId(null);
                      }}
                      onMouseDown={(e) => e.stopPropagation()}
                      aria-hidden
                    />
                    <div
                      className="absolute right-0 top-full mt-1 z-20 min-w-[180px] bg-white rounded-xl border border-slate-200 shadow-lg py-1 overflow-hidden"
                      onClick={(e) => e.stopPropagation()}
                      onMouseDown={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          const idToDelete = team.id;
                          setOpenMenuTeamId(null);
                          handleDeleteTeam(idToDelete);
                        }}
                        className="w-full flex items-center gap-2 px-4 py-2.5 text-left text-rose-600 hover:bg-rose-50 transition-colors text-sm font-medium"
                      >
                        <Trash2 size={16} /> Xóa đội ngũ đó
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="flex-1 space-y-2 mb-8">
              <h3 className="text-lg font-black text-slate-800 italic">{team.name}</h3>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">{team.description || 'Chưa có mô tả'}</p>
              {team.createdAt && (
                <p className="text-[10px] text-slate-400 font-medium pt-1">
                  Ngày tạo: {new Date(team.createdAt).toLocaleDateString('vi-VN')}
                </p>
              )}
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Thành viên ({(team.memberIds || []).length})</p>
                <button 
                  onClick={() => { setSelectedTeam(team); setIsAddMemberModalOpen(true); }}
                  className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:underline flex items-center gap-1"
                >
                  <UserPlus size={12} /> Thêm người
                </button>
              </div>
              <div className="flex -space-x-2 overflow-hidden">
                {(team.memberIds || []).map(mId => {
                  const member = allUsers.find(u => u.id === mId);
                  return (
                    <div key={mId} className="relative group/avatar">
                      <img 
                        src={`https://picsum.photos/seed/${mId}/200`} 
                        className="w-8 h-8 rounded-full border-2 border-white ring-1 ring-slate-100" 
                        alt={member?.name}
                      />
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slate-900 text-white text-[9px] rounded opacity-0 group-hover/avatar:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                        {member?.name || 'Thành viên'}
                      </div>
                    </div>
                  );
                })}
                {(team.memberIds || []).length === 0 && <p className="text-[10px] text-slate-300 italic">Chưa có thành viên</p>}
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-50 flex items-center">
              <div className="flex items-center gap-2">
                <Shield size={14} className="text-emerald-500" />
                <span className="text-[9px] font-black text-emerald-600 uppercase tracking-tighter">Bảo mật Active</span>
              </div>
            </div>
          </div>
        ))}

        {teams.length === 0 && (
          <div className="col-span-full py-20 text-center bg-white rounded-[40px] border border-dashed border-slate-200">
            <Users className="mx-auto text-slate-100 mb-4" size={64} />
            <p className="text-slate-400 font-bold italic">Bạn chưa quản lý nhóm nào. Hãy tạo nhóm đầu tiên!</p>
          </div>
        )}
      </div>

      {/* Create Team Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-md rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-xl font-black text-slate-800 italic uppercase tracking-tight">Tạo nhóm mới</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white rounded-xl transition-all"><X size={20} /></button>
            </div>
            <form onSubmit={handleCreateTeam} className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tên nhóm</label>
                <input 
                  required
                  value={newTeam.name}
                  onChange={e => setNewTeam({...newTeam, name: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-6 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                  placeholder="Ví dụ: Đội ngũ Frontend"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Mô tả nhóm</label>
                <textarea 
                  required
                  value={newTeam.description}
                  onChange={e => setNewTeam({...newTeam, description: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-6 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500/20 transition-all h-32 resize-none"
                  placeholder="Mô tả mục tiêu hoặc vai trò của nhóm..."
                />
              </div>
              <button type="submit" className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all">
                Xác nhận tạo nhóm
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Add Member Modal */}
      {isAddMemberModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-md rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h3 className="text-xl font-black text-slate-800 italic uppercase tracking-tight">Thêm thành viên</h3>
                <p className="text-[10px] text-blue-600 font-bold uppercase tracking-widest mt-1">Nhóm: {selectedTeam?.name}</p>
              </div>
              <button onClick={() => setIsAddMemberModalOpen(false)} className="p-2 hover:bg-white rounded-xl transition-all"><X size={20} /></button>
            </div>
            <div className="p-8 space-y-6">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="text" 
                  placeholder="Tìm theo tên hoặc email..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3.5 pl-12 pr-4 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                />
              </div>
              
              <div className="max-h-64 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                {filteredUsers.map(u => (
                  <button
                    key={u.id}
                    onClick={() => handleAddMember(u.id)}
                    disabled={(selectedTeam?.memberIds || []).includes(u.id)}
                    className="w-full flex items-center justify-between p-4 rounded-2xl border border-slate-50 hover:bg-slate-50 hover:border-slate-100 transition-all group disabled:opacity-50"
                  >
                    <div className="flex items-center gap-3">
                      <img src={`https://picsum.photos/seed/${u.id}/200`} className="w-10 h-10 rounded-xl" />
                      <div className="text-left">
                        <p className="text-sm font-bold text-slate-800">{u.name}</p>
                        <p className="text-[10px] text-slate-400 font-medium">{u.email}</p>
                      </div>
                    </div>
                    {(selectedTeam?.memberIds || []).includes(u.id) ? (
                      <CheckCircle2 size={18} className="text-emerald-500" />
                    ) : (
                      <Plus size={18} className="text-slate-300 group-hover:text-blue-600 transition-colors" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
