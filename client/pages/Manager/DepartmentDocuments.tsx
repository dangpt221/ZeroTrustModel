
import React, { useState } from 'react';
import { MOCK_DOCS } from '../../mockData';
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
  const [docs, setDocs] = useState(MOCK_DOCS);
  const [filter, setFilter] = useState('ALL');

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

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-2 relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-sky-500 transition-colors" size={18} />
          <input 
            type="text" 
            placeholder="Tìm tài liệu, báo cáo kỹ thuật..."
            className="w-full bg-white border border-slate-200 rounded-2xl py-3.5 pl-12 pr-4 focus:ring-2 focus:ring-sky-500 outline-none transition-all shadow-sm"
          />
        </div>
        <div className="flex gap-2">
          <select 
            className="flex-1 bg-white border border-slate-200 rounded-2xl px-4 text-sm font-bold text-slate-600 outline-none focus:ring-2 focus:ring-sky-500"
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="ALL">Mọi mức độ</option>
            <option value="CRITICAL">Critical Only</option>
            <option value="HIGH">High Sensitivity</option>
          </select>
        </div>
        <button className="bg-white border border-slate-200 text-slate-600 px-5 py-2 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-slate-50 transition-all">
          <Filter size={18} /> Bộ lọc nâng cao
        </button>
      </div>

      <div className="bg-white rounded-[32px] shadow-sm border border-slate-100 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead className="bg-sky-50/50 border-b border-sky-100 text-sky-600 text-[10px] font-black uppercase tracking-widest">
            <tr>
              <th className="px-8 py-6">Tên tài liệu</th>
              <th className="px-8 py-6">Độ nhạy cảm</th>
              <th className="px-8 py-6">Người tải lên</th>
              <th className="px-8 py-6">Ngày tạo</th>
              <th className="px-8 py-6 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {docs.map(doc => (
              <tr key={doc.id} className="hover:bg-sky-50/30 transition-colors group">
                <td className="px-8 py-5">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-sky-100 text-sky-600 rounded-xl">
                      <FileText size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800">{doc.name}</p>
                      <p className="text-[11px] text-slate-400 font-medium">{doc.size} • {doc.type.toUpperCase()}</p>
                    </div>
                  </div>
                </td>
                <td className="px-8 py-5">
                  <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg border ${
                    doc.sensitivity === 'CRITICAL' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                    doc.sensitivity === 'HIGH' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                    'bg-slate-50 text-slate-500 border-slate-100'
                  }`}>
                    {doc.sensitivity}
                  </span>
                </td>
                <td className="px-8 py-5 text-sm font-medium text-slate-600">
                  PM Engineering
                </td>
                <td className="px-8 py-5 text-xs text-slate-400 font-medium">
                  {doc.uploadedAt}
                </td>
                <td className="px-8 py-5 text-right">
                  <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="p-2 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-xl transition-all" title="Xem chi tiết">
                      <Lock size={18} />
                    </button>
                    <button className="p-2 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-xl transition-all" title="Tải xuống">
                      <Download size={18} />
                    </button>
                    <button className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all">
                      <MoreVertical size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-sky-900 rounded-3xl p-8 text-white relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <ShieldAlert size={100} />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
          <div className="flex-1">
            <h3 className="text-xl font-black mb-2 flex items-center gap-2">
              <CheckCircle2 className="text-sky-400" />
              Chế độ Phê duyệt JIT (Just-In-Time)
            </h3>
            <p className="text-sm text-sky-200 leading-relaxed max-w-2xl">
              Tài liệu mức độ <b>CRITICAL</b> yêu cầu phê duyệt tức thời từ Manager. 
              Quyền truy cập sẽ tự động hết hạn sau 4 giờ để đảm bảo nguyên tắc Zero Trust.
            </p>
          </div>
          <button className="bg-white text-sky-900 px-8 py-3 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-sky-100 transition-all shadow-xl">
            Cấu hình phê duyệt
          </button>
        </div>
      </div>
    </div>
  );
};
