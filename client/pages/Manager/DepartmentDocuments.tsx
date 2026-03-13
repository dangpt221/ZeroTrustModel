
import React, { useState, useEffect } from 'react';
import { documentsApi, departmentsApi } from '../../api';
import { Document } from '../../types';
import { Modal } from '../../components/Admin/Modal';
import { DocumentContent } from '../../components/Staff/DocumentContent';
import { useAuth } from '../../context/AuthContext';
import { usePermission } from '../../hooks/usePermission';
import { FileText, Search, Upload, Eye, Lock, Key } from 'lucide-react';

export const DepartmentDocuments: React.FC = () => {
  const { user } = useAuth();
  const { isAdmin, isManager } = usePermission();
  const [docs, setDocs] = useState<Document[]>([]);
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [viewingDoc, setViewingDoc] = useState<Document | null>(null);
  const [passwordModalDoc, setPasswordModalDoc] = useState<Document | null>(null);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [verifyingPassword, setVerifyingPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    type: 'PDF',
    size: '1MB',
    department: '',
    sensitivity: 'LOW' as Document['sensitivity'],
    description: '',
  });

  // Load docs on mount
  React.useEffect(() => {
    documentsApi.getAll().then(data => {
      if (data && data.documents) {
        setDocs(data.documents);
      } else if (Array.isArray(data)) {
        setDocs(data);
      } else {
        setDocs([]);
      }
      setLoading(false);
    }).catch(() => {
      setLoading(false);
    });

    departmentsApi.getAll().then(data => {
      setDepartments(Array.isArray(data) ? data : []);
    }).catch(() => {});
  }, []);

  const displayDocs = docs;

  const handleCreateDoc = async () => {
    if (!formData.name.trim()) {
      alert('Vui lòng nhập tên tài liệu.');
      return;
    }
    // Manager automatically gets their department ID
    const docDepartmentId = user?.departmentId;
    try {
      await documentsApi.create({
        name: formData.name,
        title: formData.name,
        type: formData.type,
        fileType: formData.type,
        size: formData.size,
        fileSize: formData.size,
        departmentId: docDepartmentId,
        sensitivity: formData.sensitivity,
        description: formData.description,
        url: '#',
        uploadedAt: new Date().toISOString(),
      });
      const data = await documentsApi.getAll();
      setDocs(Array.isArray(data) ? data : (data?.documents || []));
      setIsUploadOpen(false);
      setFormData({ name: '', type: 'PDF', size: '1MB', department: '', sensitivity: 'LOW', description: '' });
      alert('Tải lên tài liệu thành công!');
    } catch (err) {
      console.error('Create document error:', err);
      alert('Tải lên thất bại. Vui lòng thử lại.');
    }
  };

  const handleViewDoc = async (doc: Document) => {
    // Check if document requires password or is locked
    if ((doc as any).isPasswordProtected || (doc as any).isLocked) {
      if ((doc as any).isLocked) {
        alert('Tài liệu này đã bị khóa bởi Admin. Vui lòng liên hệ Admin để được truy cập.');
        return;
      }
      setPasswordModalDoc(doc);
      setPasswordInput('');
      setPasswordError('');
      return;
    }
    setViewingDoc(doc);
  };

  const handleVerifyPassword = async () => {
    if (!passwordModalDoc) return;
    try {
      setVerifyingPassword(true);
      setPasswordError('');
      const result = await documentsApi.verifyPassword(passwordModalDoc.id, passwordInput);
      if (result.verified) {
        setPasswordModalDoc(null);
        setViewingDoc(passwordModalDoc);
      }
    } catch (err: any) {
      setPasswordError(err.message || 'Mật khẩu không đúng');
    } finally {
      setVerifyingPassword(false);
    }
  };

  const getDocDisplay = (doc: Document) => ({
    name: (doc as any).name || (doc as any).title || doc.name || 'Không tên',
    type: (doc as any).type || (doc as any).fileType || doc.type || '-',
    size: (doc as any).size || (doc as any).fileSize || doc.size || '-',
    uploadedBy: (doc as any).uploadedBy || doc.uploadedBy || 'N/A',
    uploadedAt: (doc as any).uploadedAt || doc.createdAt ? new Date((doc as any).uploadedAt || doc.createdAt!).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-',
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
              ) : displayDocs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400">Không tìm thấy tài liệu</td>
                </tr>
              ) : (
                displayDocs.map(doc => {
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
                        <button
                          onClick={() => handleViewDoc(doc)}
                          className="p-2 text-sky-600 hover:bg-sky-50 rounded-lg"
                          title="Xem chi tiết"
                        >
                          <Eye size={16} />
                        </button>
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

      {/* Document Content */}
      {viewingDoc && (
        <div className="mt-6">
          <DocumentContent
            document={viewingDoc}
            onClose={() => setViewingDoc(null)}
          />
        </div>
      )}

      {/* Password Modal */}
      <Modal isOpen={!!passwordModalDoc} onClose={() => setPasswordModalDoc(null)} title="Xac thuc mat khau">
        {passwordModalDoc && (
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-4 bg-amber-50 rounded-xl border border-amber-100">
              <div className="p-3 bg-amber-100 text-amber-600 rounded-xl">
                <Lock size={24} />
              </div>
              <div>
                <h4 className="font-bold text-slate-800">{passwordModalDoc.title || passwordModalDoc.name}</h4>
                <p className="text-sm text-amber-600">Tai lieu yeu cau nhap mat khau de xem</p>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">Mat khau</label>
              <input
                type="password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleVerifyPassword()}
                placeholder="Nhap mat khau..."
                className="w-full mt-1 px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none"
                autoFocus
              />
              {passwordError && (
                <p className="text-xs text-rose-500 mt-1">{passwordError}</p>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setPasswordModalDoc(null)}
                className="flex-1 py-3 border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50 transition-all"
              >
                Huy
              </button>
              <button
                onClick={handleVerifyPassword}
                disabled={!passwordInput || verifyingPassword}
                className="flex-1 py-3 bg-amber-500 text-white rounded-xl font-bold hover:bg-amber-600 disabled:bg-slate-300 transition-all flex items-center justify-center gap-2"
              >
                {verifyingPassword ? 'Dang xac thuc...' : (
                  <>
                    <Key size={18} /> Xac nhan
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
