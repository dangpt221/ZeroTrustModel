
import React, { useEffect, useState } from 'react';
import { documentsApi } from '../../api';
import { Document } from '../../types';
import { FolderLock, Search, Filter, ShieldAlert, Lock, Eye, MoreVertical, FileText, Plus } from 'lucide-react';

export const DocumentManagement: React.FC = () => {
  const [docs, setDocs] = useState<Document[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

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

  const filteredDocs = docs.filter(d => d.name.toLowerCase().includes(searchTerm.toLowerCase()));
  const criticalDocs = docs.filter(d => d.sensitivity === 'CRITICAL').length;

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this document?')) {
      await documentsApi.delete(id);
      setDocs(docs.filter(d => d.id !== id));
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight uppercase italic">Toàn văn tài liệu</h2>
          <p className="text-slate-500 text-sm font-medium">Kiểm soát mức độ nhạy cảm và nhật ký truy cập dữ liệu hệ thống</p>
        </div>
        <div className="flex gap-3">
          <div className="bg-amber-50 px-4 py-2 rounded-xl border border-amber-100 flex items-center gap-2">
            <ShieldAlert size={18} className="text-amber-500" />
            <span className="text-[10px] font-black uppercase tracking-widest text-amber-700">Critical Docs: {loading ? '...' : criticalDocs}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
          <input
            type="text"
            placeholder="Tìm tài liệu theo tên hoặc dự án..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-2xl py-3.5 pl-12 pr-4 focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm font-medium"
          />
        </div>
        <button className="bg-white border border-slate-200 text-slate-600 px-6 py-2 rounded-2xl font-bold text-sm flex items-center gap-2 hover:bg-slate-50 transition-all">
          <Filter size={18} /> Lọc độ nhạy cảm
        </button>
        <button className="bg-blue-600 text-white px-6 py-2 rounded-2xl font-bold text-sm flex items-center gap-2 hover:bg-blue-700 transition-all">
          <Plus size={18} /> Thêm tài liệu
        </button>
      </div>

      <div className="bg-white rounded-[32px] shadow-sm border border-slate-100 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 text-[10px] font-black uppercase tracking-widest">
            <tr>
              <th className="px-8 py-6">Tài liệu / Định dạng</th>
              <th className="px-8 py-6">Bộ phận</th>
              <th className="px-8 py-6">Phân loại bảo mật</th>
              <th className="px-8 py-6">Người sở hữu</th>
              <th className="px-8 py-6 text-right">Quyền hạn</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filteredDocs.map(doc => (
              <tr key={doc.id} className="hover:bg-blue-50/20 transition-colors group">
                <td className="px-8 py-5">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-slate-100 text-slate-400 group-hover:bg-blue-100 group-hover:text-blue-600 rounded-xl transition-all">
                      <FileText size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800 italic">{doc.name}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">{doc.type} • {doc.size}</p>
                    </div>
                  </div>
                </td>
                <td className="px-8 py-5">
                  <span className="text-[10px] font-black text-slate-500 bg-slate-100 px-2 py-1 rounded uppercase tracking-tighter">
                    {doc.department}
                  </span>
                </td>
                <td className="px-8 py-5">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${
                      doc.sensitivity === 'CRITICAL' ? 'bg-rose-500' :
                      doc.sensitivity === 'HIGH' ? 'bg-amber-500' : 'bg-emerald-500'
                    }`}></div>
                    <span className={`text-[10px] font-black uppercase ${
                      doc.sensitivity === 'CRITICAL' ? 'text-rose-600' :
                      doc.sensitivity === 'HIGH' ? 'text-amber-600' : 'text-emerald-600'
                    }`}>
                      {doc.sensitivity}
                    </span>
                  </div>
                </td>
                <td className="px-8 py-5 text-xs font-bold text-slate-600">
                  U-{doc.uploadedBy}
                </td>
                <td className="px-8 py-5 text-right">
                  <div className="flex justify-end gap-1">
                    <button className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all">
                      <Eye size={18} />
                    </button>
                    <button className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all">
                      <Lock size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(doc.id)}
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                    >
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
