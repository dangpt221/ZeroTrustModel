
import React, { useState, useEffect } from 'react';
import { documentsApi } from '../../api';
import { Document } from '../../types';
import {
  FileText,
  Search,
  Upload,
  Filter,
  MoreVertical,
  Download,
  Lock,
  ShieldAlert,
  CheckCircle2,
  XCircle
} from 'lucide-react';

export const DepartmentDocuments: React.FC = () => {
  const [docs, setDocs] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchDocs = async () => {
      try {
        const data = await documentsApi.getAll();
        setDocs(data || []);
      } catch (error) {
        console.error('Error fetching documents:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchDocs();
  }, []);

  const filteredDocs = docs.filter(doc => {
    const matchesSearch = doc.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filter === 'ALL' || doc.sensitivity === filter;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight uppercase italic">Kho tài liệu Engineering</h2>
          <p className="text-slate-500 text-sm font-medium">Quản lý và cấp quyền truy cập tài nguyên dữ liệu bộ phận</p>
        </div>
        <div className="flex gap-2">
           <button className="bg-sky-600 hover:bg-sky-700 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-sky-500/20 flex items-center gap-2 transition-all active:scale-95">
            <Upload size={18} /> Tải lên tài liệu mới
          </button>
        </div>
      </div>

      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Tìm tài liệu..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl py-3 pl-12 pr-4 focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="bg-white border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none"
        >
          <option value="ALL">Tất cả</option>
          <option value="LOW">Low</option>
          <option value="MEDIUM">Medium</option>
          <option value="HIGH">High</option>
          <option value="CRITICAL">Critical</option>
        </select>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 text-[10px] font-black uppercase tracking-widest">
              <tr>
                <th className="px-6 py-4">Tài liệu</th>
                <th className="px-6 py-4">Phân loại</th>
                <th className="px-6 py-4">Người tải lên</th>
                <th className="px-6 py-4">Ngày tải</th>
                <th className="px-6 py-4 text-right">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400">Đang tải...</td>
                </tr>
              ) : filteredDocs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400">Không tìm thấy tài liệu</td>
                </tr>
              ) : (
                filteredDocs.map(doc => (
                  <tr key={doc.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-slate-100 rounded-lg">
                          <FileText size={18} className="text-slate-400" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-700">{doc.name}</p>
                          <p className="text-xs text-slate-400">{doc.type} - {doc.size}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-[10px] font-bold px-2 py-1 rounded ${
                        doc.sensitivity === 'CRITICAL' ? 'bg-rose-50 text-rose-600' :
                        doc.sensitivity === 'HIGH' ? 'bg-amber-50 text-amber-600' :
                        'bg-emerald-50 text-emerald-600'
                      }`}>
                        {doc.sensitivity}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">{doc.uploadedBy}</td>
                    <td className="px-6 py-4 text-sm text-slate-500">{doc.uploadedAt}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg">
                          <Download size={16} />
                        </button>
                        <button className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg">
                          <Lock size={16} />
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
    </div>
  );
};
