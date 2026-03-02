
import React, { useState, useEffect } from 'react';
import { documentsApi, departmentsApi } from '../../api';
import { Document } from '../../types';
import { Modal } from '../../components/Admin/Modal';
import {
  FileText,
  Search,
  Upload,
  MoreVertical,
  Download,
  Trash2,
  X,
  Eye
} from 'lucide-react';

export const DepartmentDocuments: React.FC = () => {
  const [docs, setDocs] = useState<Document[]>([]);
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [openMenuDocId, setOpenMenuDocId] = useState<string | null>(null);
  const [viewingDoc, setViewingDoc] = useState<Document | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'PDF',
    size: '1MB',
    department: '',
    sensitivity: 'LOW' as Document['sensitivity'],
    description: '',
  });

  useEffect(() => {
    const fetchDocs = async () => {
      try {
        const data = await documentsApi.getAll();
        // Handle both array response and { documents: [] } response
        if (Array.isArray(data)) {
          setDocs(data);
        } else if (data?.documents) {
          setDocs(data.documents);
        } else {
          setDocs([]);
        }
      } catch (error) {
        console.error('Error fetching documents:', error);
        setDocs([]);
      } finally {
        setLoading(false);
      }
    };
    const fetchDepts = async () => {
      try {
        const data = await departmentsApi.getAll();
        setDepartments(Array.isArray(data) ? data : []);
      } catch {
        setDepartments([]);
      }
    };
    fetchDocs();
    fetchDepts();
  }, []);

  const filteredDocs = docs.filter(doc => {
    const name = (doc as any).name || doc.name || (doc as any).title || '';
    const matchesSearch = name.toLowerCase().includes(searchTerm.toLowerCase());
    const sens = doc.sensitivity || (doc as any).sensitivity;
    const matchesFilter = filter === 'ALL' || sens === filter;
    return matchesSearch && matchesFilter;
  });

  const handleCreateDoc = async () => {
    if (!formData.name.trim()) {
      alert('Vui lòng nhập tên tài liệu.');
      return;
    }
    try {
      await documentsApi.create({
        name: formData.name,
        title: formData.name,
        type: formData.type,
        fileType: formData.type,
        size: formData.size,
        fileSize: formData.size,
        department: formData.department,
        departmentId: formData.department || undefined,
        sensitivity: formData.sensitivity,
        description: formData.description,
        url: '#',
        uploadedAt: new Date().toISOString(),
      });
      const data = await documentsApi.getAll();
      setDocs(Array.isArray(data) ? data : []);
      setIsUploadOpen(false);
      setFormData({ name: '', type: 'PDF', size: '1MB', department: '', sensitivity: 'LOW', description: '' });
      alert('Tải lên tài liệu thành công!');
    } catch (err) {
      console.error('Create document error:', err);
      alert('Tải lên thất bại. Vui lòng thử lại.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa tài liệu này?')) return;
    try {
      await documentsApi.delete(id);
      setDocs(prev => prev.filter(d => d.id !== id));
      setOpenMenuDocId(null);
      setViewingDoc(prev => (prev?.id === id ? null : prev));
      alert('Xóa tài liệu thành công!');
    } catch (err) {
      console.error('Delete document error:', err);
      alert(err instanceof Error ? err.message : 'Xóa tài liệu thất bại.');
    }
  };

  const handleDownload = (doc: Document) => {
    const url = doc.url || (doc as any).url;
    if (url && url !== '#') {
      window.open(url, '_blank');
    } else {
      alert('Tài liệu chưa có đường dẫn tải.');
    }
  };

  const getDocDisplay = (doc: Document) => ({
    name: (doc as any).name || (doc as any).title || doc.name || 'Không tên',
    type: (doc as any).type || (doc as any).fileType || doc.type || '-',
    size: (doc as any).size || (doc as any).fileSize || doc.size || '-',
    uploadedBy: (doc as any).uploadedBy || doc.uploadedBy || 'N/A',
    uploadedAt: (doc as any).uploadedAt || doc.uploadedAt ? new Date((doc as any).uploadedAt).toLocaleDateString('vi-VN') : '-',
    sensitivity: doc.sensitivity || (doc as any).sensitivity || 'LOW',
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight uppercase italic">Tài liệu bộ phận</h2>
          <p className="text-slate-500 text-sm font-medium">Quản lý và cấp quyền truy cập tài nguyên dữ liệu bộ phận</p>
        </div>
        <button
          onClick={() => setIsUploadOpen(true)}
          className="bg-sky-600 hover:bg-sky-700 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-sky-500/20 flex items-center gap-2 transition-all active:scale-95"
        >
          <Upload size={18} /> Tải lên tài liệu mới
        </button>
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
                filteredDocs.map(doc => {
                  const d = getDocDisplay(doc);
                  return (
                    <tr key={doc.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-slate-100 rounded-lg">
                            <FileText size={18} className="text-slate-400" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-700">{d.name}</p>
                            <p className="text-xs text-slate-400">{d.type} - {d.size}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-[10px] font-bold px-2 py-1 rounded ${
                          d.sensitivity === 'CRITICAL' ? 'bg-rose-50 text-rose-600' :
                          d.sensitivity === 'HIGH' ? 'bg-amber-50 text-amber-600' :
                          d.sensitivity === 'MEDIUM' ? 'bg-sky-50 text-sky-600' :
                          'bg-emerald-50 text-emerald-600'
                        }`}>
                          {d.sensitivity}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">{d.uploadedBy}</td>
                      <td className="px-6 py-4 text-sm text-slate-500">{d.uploadedAt}</td>
                      <td className="px-6 py-4">
                        <div className="flex justify-end gap-2 items-center">
                          <button
                            onClick={() => handleDownload(doc)}
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                            title="Tải xuống"
                          >
                            <Download size={16} />
                          </button>
                          <div className="relative">
                            <button
                              onClick={() => setOpenMenuDocId(openMenuDocId === doc.id ? null : doc.id)}
                              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"
                            >
                              <MoreVertical size={16} />
                            </button>
                            {openMenuDocId === doc.id && (
                              <>
                                <div
                                  className="fixed inset-0 z-10"
                                  onClick={() => setOpenMenuDocId(null)}
                                  aria-hidden
                                />
                                <div
                                  className="absolute right-0 top-full mt-1 z-20 min-w-[160px] bg-white rounded-xl border border-slate-200 shadow-lg py-1 overflow-hidden"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setViewingDoc(doc);
                                      setOpenMenuDocId(null);
                                    }}
                                    className="w-full flex items-center gap-2 px-4 py-2.5 text-left text-slate-700 hover:bg-slate-50 text-sm font-medium"
                                  >
                                    <Eye size={16} /> Xem chi tiết
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOpenMenuDocId(null);
                                      handleDelete(doc.id);
                                    }}
                                    className="w-full flex items-center gap-2 px-4 py-2.5 text-left text-rose-600 hover:bg-rose-50 text-sm font-medium"
                                  >
                                    <Trash2 size={16} /> Xóa tài liệu
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Upload Modal */}
      <Modal isOpen={isUploadOpen} onClose={() => setIsUploadOpen(false)} title="Tải lên tài liệu mới" size="lg">
        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase">Tên tài liệu</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full mt-1 px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 outline-none"
              placeholder="Ví dụ: Quy trình onboarding.pdf"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">Loại file</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full mt-1 px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 outline-none"
              >
                <option value="PDF">PDF</option>
                <option value="DOC">DOC</option>
                <option value="DOCX">DOCX</option>
                <option value="XLS">XLS</option>
                <option value="XLSX">XLSX</option>
                <option value="Other">Khác</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">Kích thước (ước lượng)</label>
              <input
                type="text"
                value={formData.size}
                onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                className="w-full mt-1 px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 outline-none"
                placeholder="1MB"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase">Độ nhạy cảm</label>
            <select
              value={formData.sensitivity}
              onChange={(e) => setFormData({ ...formData, sensitivity: e.target.value as Document['sensitivity'] })}
              className="w-full mt-1 px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 outline-none"
            >
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="CRITICAL">Critical</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase">Bộ phận</label>
            <select
              value={formData.department}
              onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              className="w-full mt-1 px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 outline-none"
            >
              <option value="">Chọn bộ phận</option>
              {departments.map(dept => (
                <option key={dept.id} value={dept.id}>{dept.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase">Mô tả (tùy chọn)</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full mt-1 px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 outline-none h-20 resize-none"
              placeholder="Mô tả ngắn về tài liệu..."
            />
          </div>
          <button
            onClick={handleCreateDoc}
            disabled={!formData.name.trim()}
            className="w-full bg-sky-600 hover:bg-sky-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white py-3 rounded-xl font-bold transition-all"
          >
            Tải lên
          </button>
        </div>
      </Modal>

      {/* View detail modal */}
      {viewingDoc && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-lg font-black text-slate-800">Chi tiết tài liệu</h3>
              <button onClick={() => setViewingDoc(null)} className="p-2 hover:bg-slate-100 rounded-xl">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {(() => {
                const d = getDocDisplay(viewingDoc);
                return (
                  <>
                    <div>
                      <p className="text-xs text-slate-400 uppercase font-bold">Tên</p>
                      <p className="text-sm font-bold text-slate-800">{d.name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 uppercase font-bold">Loại / Kích thước</p>
                      <p className="text-sm text-slate-700">{d.type} - {d.size}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 uppercase font-bold">Độ nhạy cảm</p>
                      <span className={`text-[10px] font-bold px-2 py-1 rounded ${d.sensitivity === 'CRITICAL' ? 'bg-rose-50 text-rose-600' : d.sensitivity === 'HIGH' ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'}`}>
                        {d.sensitivity}
                      </span>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 uppercase font-bold">Ngày tải</p>
                      <p className="text-sm text-slate-700">{d.uploadedAt}</p>
                    </div>
                    <div className="flex gap-2 pt-4">
                      <button
                        onClick={() => handleDownload(viewingDoc)}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-sky-600 text-white rounded-xl font-bold text-sm"
                      >
                        <Download size={16} /> Tải xuống
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('Xóa tài liệu này?')) {
                            setViewingDoc(null);
                            handleDelete(viewingDoc.id);
                          }
                        }}
                        className="flex items-center gap-2 px-4 py-2.5 bg-rose-50 text-rose-600 rounded-xl font-bold text-sm"
                      >
                        <Trash2 size={16} /> Xóa
                      </button>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
