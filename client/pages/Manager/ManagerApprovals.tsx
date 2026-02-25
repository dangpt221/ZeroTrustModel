
import React, { useState } from 'react';
import { 
  FileCheck, 
  Clock, 
  User, 
  ShieldAlert, 
  CheckCircle2, 
  XCircle, 
  ExternalLink,
  Search,
  Filter
} from 'lucide-react';
import { MOCK_DOCS, MOCK_USERS } from '../../mockData';

interface ApprovalRequest {
  id: string;
  userId: string;
  docId: string;
  reason: string;
  duration: string;
  timestamp: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
}

const MOCK_REQUESTS: ApprovalRequest[] = [
  {
    id: 'req1',
    userId: 'u3',
    docId: 'd1',
    reason: 'Cần kiểm tra lại kế hoạch migrate database cho sprint tới.',
    duration: '4',
    timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    status: 'PENDING'
  },
  {
    id: 'req2',
    userId: 'u3',
    docId: 'd2',
    reason: 'Review chi phí hạ tầng Cloud cho quý 3.',
    duration: '1',
    timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    status: 'PENDING'
  }
];

export const ManagerApprovals: React.FC = () => {
  const [requests, setRequests] = useState<ApprovalRequest[]>(MOCK_REQUESTS);

  const handleAction = (id: string, status: 'APPROVED' | 'REJECTED') => {
    setRequests(requests.map(req => req.id === id ? { ...req, status } : req));
    const actionText = status === 'APPROVED' ? 'Phê duyệt' : 'Từ chối';
    alert(`Đã ${actionText} yêu cầu truy cập. Hệ thống SOC đã cập nhật quyền hạn JIT.`);
  };

  const pendingCount = requests.filter(r => r.status === 'PENDING').length;

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight uppercase italic text-sky-600">Trung tâm Phê duyệt</h2>
          <p className="text-slate-500 text-sm font-medium">Quản lý các yêu cầu truy cập tài liệu nhạy cảm (Just-In-Time Access)</p>
        </div>
        <div className="flex gap-3">
          <div className="bg-amber-50 px-4 py-2 rounded-xl border border-amber-100 flex items-center gap-2">
            <Clock size={18} className="text-amber-500" />
            <span className="text-[10px] font-black uppercase tracking-widest text-amber-700">Đang chờ: {pendingCount} yêu cầu</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-sky-500 transition-colors" size={18} />
          <input 
            type="text" 
            placeholder="Tìm kiếm yêu cầu theo tên nhân viên hoặc tài liệu..."
            className="w-full bg-white border border-slate-200 rounded-2xl py-3.5 pl-12 pr-4 focus:ring-2 focus:ring-sky-500/20 outline-none transition-all shadow-sm font-medium text-sm"
          />
        </div>
        <button className="bg-white border border-slate-200 text-slate-600 px-6 py-2 rounded-2xl font-bold text-sm flex items-center gap-2 hover:bg-slate-50 transition-all">
          <Filter size={18} /> Trạng thái
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {requests.map(req => {
          const user = MOCK_USERS.find(u => u.id === req.userId);
          const doc = MOCK_DOCS.find(d => d.id === req.docId);
          
          return (
            <div key={req.id} className={`bg-white rounded-[32px] border transition-all p-8 flex flex-col md:flex-row gap-8 items-start md:items-center shadow-sm hover:shadow-md ${
              req.status === 'PENDING' ? 'border-amber-100' : 'border-slate-100 opacity-80'
            }`}>
              <div className="flex items-center gap-4 min-w-[240px]">
                <img src={user?.avatar} className="w-14 h-14 rounded-2xl object-cover ring-4 ring-slate-50" />
                <div>
                  <p className="text-base font-black text-slate-800">{user?.name}</p>
                  <p className="text-xs text-slate-400 font-medium">{user?.department} • Trust: {user?.trustScore}%</p>
                </div>
              </div>

              <div className="flex-1 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-sky-600 bg-sky-50 px-2 py-0.5 rounded">Yêu cầu truy cập</span>
                  <h4 className="text-sm font-bold text-slate-700 italic flex items-center gap-1.5">
                    {doc?.name} <ExternalLink size={12} className="text-slate-300" />
                  </h4>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <span className="font-bold text-slate-400 uppercase text-[9px] block mb-1">Lý do:</span>
                  "{req.reason}"
                </p>
                <div className="flex items-center gap-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  <span className="flex items-center gap-1"><Clock size={12} /> Thời hạn: {req.duration} giờ</span>
                  <span className="flex items-center gap-1"><ShieldAlert size={12} /> Độ nhạy: {doc?.sensitivity}</span>
                </div>
              </div>

              <div className="flex flex-row md:flex-col gap-2 w-full md:w-auto">
                {req.status === 'PENDING' ? (
                  <>
                    <button 
                      onClick={() => handleAction(req.id, 'APPROVED')}
                      className="flex-1 md:w-32 py-3 bg-emerald-500 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
                    >
                      <CheckCircle2 size={14} /> Phê duyệt
                    </button>
                    <button 
                      onClick={() => handleAction(req.id, 'REJECTED')}
                      className="flex-1 md:w-32 py-3 bg-white border border-rose-100 text-rose-500 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-rose-50 transition-all flex items-center justify-center gap-2"
                    >
                      <XCircle size={14} /> Từ chối
                    </button>
                  </>
                ) : (
                  <div className={`px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest text-center border ${
                    req.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'
                  }`}>
                    {req.status}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {requests.length === 0 && (
          <div className="py-32 text-center bg-white rounded-[40px] border border-dashed border-slate-200">
            <FileCheck className="mx-auto text-slate-100 mb-6" size={80} />
            <p className="text-slate-400 font-bold italic text-lg">Không có yêu cầu phê duyệt nào đang chờ.</p>
          </div>
        )}
      </div>

      <div className="bg-slate-900 p-8 rounded-[40px] text-white relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <ShieldAlert size={100} />
        </div>
        <div className="relative z-10">
          <h3 className="text-xl font-black mb-4 flex items-center gap-2">
            <CheckCircle2 className="text-emerald-400" />
            Chính sách Phê duyệt Tức thời
          </h3>
          <p className="text-sm text-slate-400 leading-relaxed max-w-3xl">
            Hệ thống đang áp dụng cơ chế <b>Zero Trust Just-In-Time</b>. Mọi quyền truy cập được cấp sẽ tự động bị thu hồi sau thời gian chỉ định. 
            Manager chịu trách nhiệm về tính hợp lệ của các yêu cầu được phê duyệt trong bộ phận.
          </p>
        </div>
      </div>
    </div>
  );
};
