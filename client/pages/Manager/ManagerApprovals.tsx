
import React, { useState, useEffect } from 'react';
import { documentsApi, usersApi } from '../../api';
import { User } from '../../types';
import {
  FileCheck,
  Clock,
  CheckCircle2,
  XCircle,
  Search
} from 'lucide-react';

interface ApprovalRequest {
  id: string;
  userId: string;
  documentId: string;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
}

export const ManagerApprovals: React.FC = () => {
  const [requests, setRequests] = useState<ApprovalRequest[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [requestsData, docsData, usersData] = await Promise.all([
          documentsApi.getRequests(),
          documentsApi.getAll(),
          usersApi.getAll()
        ]);
        setRequests(requestsData || []);
        setDocuments(docsData || []);
        setUsers(usersData || []);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleAction = async (id: string, status: 'APPROVED' | 'REJECTED') => {
    try {
      await documentsApi.updateRequest(id, status);
      setRequests(requests.map(req => req.id === id ? { ...req, status } : req));
      const actionText = status === 'APPROVED' ? 'Phê duyệt' : 'Từ chối';
      alert(`Đã ${actionText} yêu cầu truy cập.`);
    } catch (error) {
      console.error('Error updating request:', error);
    }
  };

  const pendingCount = requests.filter(r => r.status === 'PENDING').length;

  const getUser = (userId: string) => users.find(u => u.id === userId);
  const getDoc = (docId: string) => documents.find(d => d.id === docId);

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 uppercase italic">Phê duyệt yêu cầu</h2>
          <p className="text-slate-500 text-sm">Quản lý quyền truy cập tài liệu Just-In-Time</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-amber-50 px-4 py-2 rounded-xl border border-amber-100 flex items-center gap-2">
            <Clock size={18} className="text-amber-500" />
            <span className="text-[10px] font-black uppercase tracking-widest text-amber-700">{pendingCount} chờ duyệt</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 text-[10px] font-black uppercase tracking-widest">
              <tr>
                <th className="px-6 py-4">Người yêu cầu</th>
                <th className="px-6 py-4">Tài liệu</th>
                <th className="px-6 py-4">Lý do</th>
                <th className="px-6 py-4">Thời gian</th>
                <th className="px-6 py-4">Trạng thái</th>
                <th className="px-6 py-4 text-right">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">Đang tải...</td>
                </tr>
              ) : requests.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">Không có yêu cầu nào</td>
                </tr>
              ) : (
                requests.map(req => {
                  const user = getUser(req.userId);
                  const doc = getDoc(req.documentId);
                  return (
                    <tr key={req.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <img src={user?.avatar || 'https://picsum.photos/seed/default/200'} className="w-8 h-8 rounded-full" />
                          <span className="text-sm font-medium text-slate-700">{user?.name || 'Unknown'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">{doc?.name || 'Unknown'}</td>
                      <td className="px-6 py-4 text-sm text-slate-500 max-w-xs truncate">{req.reason}</td>
                      <td className="px-6 py-4 text-xs text-slate-400">{new Date(req.createdAt).toLocaleString()}</td>
                      <td className="px-6 py-4">
                        <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${
                          req.status === 'PENDING' ? 'bg-amber-50 text-amber-600' :
                          req.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-600' :
                          'bg-rose-50 text-rose-600'
                        }`}>
                          {req.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {req.status === 'PENDING' && (
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => handleAction(req.id, 'APPROVED')}
                              className="p-2 text-emerald-500 hover:bg-emerald-50 rounded-lg"
                            >
                              <CheckCircle2 size={18} />
                            </button>
                            <button
                              onClick={() => handleAction(req.id, 'REJECTED')}
                              className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg"
                            >
                              <XCircle size={18} />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
