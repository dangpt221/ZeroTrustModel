
import React from 'react';
import { User, UserRole } from '../../types';
import { ShieldAlert, UserCheck, Lock, Smartphone, MoreVertical } from 'lucide-react';

interface StaffTableProps {
  staff: User[];
  onAction: (user: User, action: string) => void;
}

export const StaffTable: React.FC<StaffTableProps> = ({ staff, onAction }) => {
  return (
    <div className="bg-white rounded-[32px] shadow-sm border border-sky-100 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead className="bg-sky-50/50 text-sky-600 text-[10px] font-black uppercase tracking-widest border-b border-sky-50">
            <tr>
              <th className="px-4 md:px-8 py-4 md:py-6">Username / Staff</th>
              <th className="px-4 md:px-8 py-4 md:py-6">Trạng thái</th>
              <th className="px-4 md:px-8 py-4 md:py-6">Trust Score</th>
              <th className="px-4 md:px-8 py-4 md:py-6">Bộ phận</th>
              <th className="px-4 md:px-8 py-4 md:py-6 text-right">Hành động bảo mật</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {staff.map((member) => (
              <tr key={member.id} className="hover:bg-sky-50/30 transition-colors group">
                <td className="px-4 md:px-8 py-5">
                  <div className="flex items-center gap-4 cursor-pointer" onClick={() => onAction(member, 'VIEW_DETAILS')}>
                    <div className="relative">
                      <img src={member.avatar} className="w-11 h-11 rounded-2xl object-cover ring-2 ring-white shadow-sm" />
                      <div className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 border-2 border-white rounded-full ${member.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800">{member.name}</p>
                      <p className="text-[11px] text-slate-400 font-medium">{member.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 md:px-8 py-5">
                  <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg border uppercase ${
                    member.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'
                  }`}>
                    {member.status}
                  </span>
                </td>
                <td className="px-4 md:px-8 py-5">
                   <div className="flex flex-col gap-1.5">
                    <span className={`text-[10px] font-black uppercase ${member.trustScore > 80 ? 'text-emerald-500' : 'text-amber-500'}`}>
                      {member.trustScore}% Verified
                    </span>
                    <div className="w-24 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                      <div className={`h-full ${member.trustScore > 80 ? 'bg-emerald-500' : 'bg-amber-500'}`} style={{ width: `${member.trustScore}%` }}></div>
                    </div>
                  </div>
                </td>
                <td className="px-4 md:px-8 py-5 text-xs font-bold text-slate-600">
                  {member.department}
                </td>
                <td className="px-4 md:px-8 py-5 text-right">
                  <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => onAction(member, 'REQUEST_MFA')}
                      className="p-2 text-sky-600 hover:bg-sky-50 rounded-xl transition-all" 
                      title="Yêu cầu bật 2FA"
                    >
                      <Smartphone size={18} />
                    </button>
                    <button 
                      onClick={() => onAction(member, member.status === 'ACTIVE' ? 'REQUEST_LOCK' : 'REQUEST_UNLOCK')}
                      className={`p-2 rounded-xl transition-all ${member.status === 'ACTIVE' ? 'text-rose-500 hover:bg-rose-50' : 'text-emerald-500 hover:bg-emerald-50'}`}
                      title={member.status === 'ACTIVE' ? "Yêu cầu khóa tài khoản" : "Yêu cầu mở khóa"}
                    >
                      {member.status === 'ACTIVE' ? <Lock size={18} /> : <UserCheck size={18} />}
                    </button>
                    <button className="p-2 text-slate-400 hover:text-slate-600">
                      <MoreVertical size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
