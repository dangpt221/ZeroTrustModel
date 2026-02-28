
import React, { useState, useEffect } from 'react';
import { documentsApi, usersApi } from '../../api';
import { User } from '../../types';
import {
  Clock,
  CheckCircle2,
  XCircle,
  Search,
  Filter,
  FileText
} from 'lucide-react';

interface ApprovalRequest {
  id: string;
  userId: string;
  documentId: string;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
  reviewedAt?: string | null;
  reviewedBy?: string | null;
}

export const ManagerApprovals: React.FC = () => {
  const [requests, setRequests] = useState<ApprovalRequest[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL');

  const fetchData = async () => {
    try {
      const [requestsData, docsData, usersData] = await Promise.all([
        documentsApi.getRequests(),
        documentsApi.getAll(),
        usersApi.getAll()
      ]);
      setRequests(Array.isArray(requestsData) ? requestsData : []);
      setDocuments(Array.isArray(docsData) ? docsData : []);
      setUsers(Array.isArray(usersData) ? usersData : []);
    } catch (error) {
      console.error('Error fetching data:', error);
      setRequests([]);
      setDocuments([]);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAction = async (id: string, status: 'APPROVED' | 'REJECTED') => {
    if (status === 'REJECTED' && !confirm('Bạn có chắc chắn muốn từ chối yêu cầu truy cập này?')) return;
    try {
      await documentsApi.updateRequest(id, status);
      setRequests(prev => prev.map(req =>
        req.id === id
          ? { ...req, status, reviewedAt: new Date().toISOString() }
          : req
      ));
      alert(status === 'APPROVED' ? 'Đã phê duyệt yêu cầu truy cập.' : 'Đã từ chối yêu cầu.');
    } catch (error) {
      console.error('Error updating request:', error);
      alert(error instanceof Error ? error.message : 'Thao tác thất bại. Vui lòng thử lại.');
    }
  };

  const getUser = (userId: string) => users.find(u => u.id === userId);
  const getDoc = (docId: string) => {
    const doc = documents.find(d => d.id === docId);
    return doc ? (doc.name || doc.title || 'Tài liệu') : 'Không xác định';
  };

  const filteredRequests = requests.filter(req => {
    const user = getUser(req.userId);
    const docName = getDoc(req.documentId);
    const matchSearch =
      (user?.name?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (user?.email?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (docName?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (req.reason?.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchStatus =
      statusFilter === 'ALL' || req.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const pendingCount = requests.filter(r => r.status === 'PENDING').length;
  const approvedCount = requests.filter(r => r.status === 'APPROVED').length;
  const rejectedCount = requests.filter(r => r.status === 'REJECTED').length;

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 uppercase italic">Phê duyệt truy cập</h2>
          <p className="text-slate-500 text-sm mt-1">Quản lý quyền truy cập tài liệu Just-In-Time theo yêu cầu</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="bg-amber-50 px-4 py-2 rounded-xl border border-amber-100 flex items-center gap-2">
            <Clock size={18} className="text-amber-500" />
            <span className="text-[10px] font-black uppercase tracking-widest text-amber-700">{pendingCount} chờ duyệt</span>
          </div>
          <div className="bg-emerald-50 px-4 py-2 rounded-xl border border-emerald-100 flex items-center gap-2">
            <CheckCircle2 size={18} className="text-emerald-500" />
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700">{approvedCount} đã duyệt</span>
          </div>
          <div className="bg-rose-50 px-4 py-2 rounded-xl border border-rose-100 flex items-center gap-2">
            <XCircle size={18} className="text-rose-500" />
            <span className="text-[10px] font-black uppercase tracking-widest text-rose-700">{rejectedCount} từ chối</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Tìm theo người yêu cầu, tài liệu hoặc lý do..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl py-3 pl-12 pr-4 focus:ring-2 focus:ring-sky-500 outline-none"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {(['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-all ${
                statusFilter === status
                  ? status === 'PENDING'
                    ? 'bg-amber-500 text-white'
                    : status === 'APPROVED'
                    ? 'bg-emerald-500 text-white'
                    : status === 'REJECTED'
                    ? 'bg-rose-500 text-white'
                    : 'bg-slate-700 text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Filter size={16} />
              {status === 'ALL' ? 'Tất cả' : status === 'PENDING' ? 'Chờ duyệt' : status === 'APPROVED' ? 'Đã duyệt' : 'Từ chối'}
            </button>
          ))}
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
                <th className="px-6 py-4">Thời gian yêu cầu</th>
                <th className="px-6 py-4">Trạng thái</th>
                <th className="px-6 py-4 text-right">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">Đang tải...</td>
                </tr>
              ) : filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    {requests.length === 0 ? 'Chưa có yêu cầu truy cập nào.' : 'Không tìm thấy yêu cầu phù hợp.'}
                  </td>
                </tr>
              ) : (
                filteredRequests.map(req => {
                  const user = getUser(req.userId);
                  const docName = getDoc(req.documentId);
                  return (
                    <tr key={req.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={user?.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + req.userId}
                            alt=""
                            className="w-9 h-9 rounded-full object-cover ring-2 ring-slate-100"
                          />
                          <div>
                            <p className="text-sm font-bold text-slate-700">{user?.name || 'Người dùng'}</p>
                            <p className="text-xs text-slate-400">{user?.email || req.userId}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <FileText size={16} className="text-slate-400 shrink-0" />
                          <span className="text-sm text-slate-600">{docName}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600 max-w-xs">
                        <span className="line-clamp-2" title={req.reason}>{req.reason || '—'}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-xs font-medium text-slate-700">
                            {req.createdAt ? new Date(req.createdAt).toLocaleString('vi-VN') : '—'}
                          </p>
                          {req.reviewedAt && req.status !== 'PENDING' && (
                            <p className="text-[10px] text-slate-400 mt-0.5">
                              {req.status === 'APPROVED' ? 'Duyệt' : 'Từ chối'}: {new Date(req.reviewedAt).toLocaleString('vi-VN')}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full ${
                          req.status === 'PENDING'
                            ? 'bg-amber-50 text-amber-600'
                            : req.status === 'APPROVED'
                            ? 'bg-emerald-50 text-emerald-600'
                            : 'bg-rose-50 text-rose-600'
                        }`}>
                          {req.status === 'PENDING' && <Clock size={12} />}
                          {req.status === 'APPROVED' && <CheckCircle2 size={12} />}
                          {req.status === 'REJECTED' && <XCircle size={12} />}
                          {req.status === 'PENDING' ? 'Chờ duyệt' : req.status === 'APPROVED' ? 'Đã duyệt' : 'Từ chối'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {req.status === 'PENDING' ? (
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => handleAction(req.id, 'APPROVED')}
                              className="p-2.5 text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors"
                              title="Phê duyệt"
                            >
                              <CheckCircle2 size={20} />
                            </button>
                            <button
                              onClick={() => handleAction(req.id, 'REJECTED')}
                              className="p-2.5 text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                              title="Từ chối"
                            >
                              <XCircle size={20} />
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
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
