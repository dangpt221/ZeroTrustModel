
import React, { useEffect, useState } from 'react';
import { documentsApi, departmentsApi } from '../../api';
import { Document } from '../../types';
import { Search, Filter, ShieldAlert, Eye, MoreVertical, FileText, Plus, Download, Upload, X, File, Lock, Unlock, Key, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Modal } from '../../components/Admin/Modal';
import { useAuth } from '../../context/AuthContext';
import { DocumentViewerModal } from '../../components/Staff/DocumentViewerModal';

export const DocumentManagement: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const hasApprovePerm = isAdmin || user?.permissions?.includes('DOC_APPROVE');
  const hasUploadPerm = isAdmin || user?.permissions?.includes('DOC_UPLOAD');
  const hasDeletePerm = isAdmin || user?.permissions?.includes('DOC_DELETE');
  const hasEditPerm = isAdmin || user?.permissions?.includes('DOC_EDIT');

  // Helper to get user name safely
  const getUserName = (user: any) => {
    if (!user) return 'N/A';
    if (typeof user === 'string') return user;
    return user.name || user.email || 'N/A';
  };

  // Helper to get document title safely
  const getDocTitle = (doc: any) => {
    if (!doc) return 'N/A';
    if (typeof doc === 'string') return doc;
    return doc.title || doc.name || 'N/A';
  };

  const [docs, setDocs] = useState<Document[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filterSensitivity, setFilterSensitivity] = useState<string>('ALL');
  const [viewingDoc, setViewingDoc] = useState<Document | null>(null);
  const [securityModalDoc, setSecurityModalDoc] = useState<Document | null>(null);
  const [passwordInput, setPasswordInput] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    fileType: 'PDF',
    fileSize: '1MB',
    departmentId: '',
    sensitivity: 'LOW',
    classification: 'INTERNAL',
    securityLevel: 1,
    url: ''
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  // Access requests management
  const [requests, setRequests] = useState<any[]>([]);
  const [showRequests, setShowRequests] = useState(false);
  const [requestLoading, setRequestLoading] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [docsResponse, deptsData] = await Promise.all([
          documentsApi.getAll(),
          departmentsApi.getAll()
        ]);
        // API returns { documents: [], pagination: {} }
        setDocs(docsResponse?.documents || []);
        setDepartments(deptsData || []);
        // Load initial requests count for the notification badge
        loadRequests();
      } catch (error) {
        console.error('Error fetching documents:', error);
        setDocs([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Load access requests
  const loadRequests = async () => {
    try {
      setRequestLoading(true);
      const data = await documentsApi.getRequests();
      setRequests(data || []);
    } catch (err) {
      console.error('Error loading requests:', err);
      setRequests([]);
    } finally {
      setRequestLoading(false);
    }
  };

  // Load requests when showRequests is toggled
  useEffect(() => {
    if (showRequests) {
      loadRequests();
    }
  }, [showRequests]);

  const handleApproveRequest = async (requestId: string) => {
    try {
      await documentsApi.updateRequest(requestId, 'APPROVED');
      alert('Đã duyệt yêu cầu!');
      loadRequests();
    } catch (err) {
      console.error('Approve error:', err);
      alert('Thao tác thất bại!');
    }
  };

  const handleRevokeAccess = async (requestId: string) => {
    if (!confirm('Bạn có chắc chắn muốn thu hồi quyền truy cập của người dùng này?')) return;
    try {
      await documentsApi.revokeAccess(requestId);
      alert('Đã thu hồi quyền truy cập!');
      loadRequests();
    } catch (err) {
      console.error('Revoke error:', err);
      alert('Thao tác thất bại!');
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    if (!rejectReason.trim()) {
      alert('Vui lòng nhập lý do từ chối!');
      return;
    }
    try {
      await documentsApi.updateRequest(requestId, 'REJECTED', rejectReason);
      alert('Đã từ chối yêu cầu!');
      setSelectedRequest(null);
      setRejectReason('');
      loadRequests();
    } catch (err) {
      console.error('Reject error:', err);
      alert('Thao tác thất bại!');
    }
  };

  const filteredDocs = docs.filter(d => {
    const matchSearch = d.title?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchSensitivity = filterSensitivity === 'ALL' || d.sensitivity === filterSensitivity;
    return matchSearch && matchSensitivity;
  });
  const criticalDocs = docs.filter(d => d.sensitivity === 'CRITICAL').length;

  const handleDelete = async (id: string) => {
    if (confirm('Bạn có chắc chắn muốn xóa tài liệu này?')) {
      try {
        await documentsApi.delete(id);
        setDocs(docs.filter(d => d.id !== id));
        alert('Xóa tài liệu thành công!');
      } catch (err) {
        console.error('Delete document error:', err);
        alert('Xóa tài liệu thất bại!');
      }
    }
  };

  const handleToggleLock = async (doc: Document, isLocked: boolean) => {
    try {
      await documentsApi.toggleLock(doc.id, isLocked);
      alert(isLocked ? 'Khóa tài liệu thành công!' : 'Mở khóa tài liệu thành công!');
      // Refresh documents
      const docsResponse = await documentsApi.getAll();
      setDocs(docsResponse?.documents || []);
    } catch (err) {
      console.error('Toggle lock error:', err);
      alert('Thao tác thất bại!');
    }
  };

  const handleResetAccess = async (doc: Document) => {
    try {
      await documentsApi.resetAccess(doc.id);
      alert('Đã mở khóa tài liệu thành công! Người dùng có thể nhập mật khẩu lại.');
      // Refresh documents
      const docsResponse = await documentsApi.getAll();
      setDocs(docsResponse?.documents || []);
    } catch (err) {
      console.error('Reset access error:', err);
      alert('Thao tác thất bại!');
    }
  };

  const handleCreateDoc = async () => {
    if (!formData.title) {
      alert('Vui long nhap ten tai lieu!');
      return;
    }

    try {
      setUploading(true);

      let fileUrl = formData.url || '#';
      let fileSize = formData.fileSize;
      let fileType = formData.fileType;
      let encryptionMetadata = undefined;

      // Upload file if selected
      if (selectedFile) {
        const uploadResult = await documentsApi.uploadFile(selectedFile);
        fileUrl = uploadResult.url;
        fileSize = String(uploadResult.fileSize);
        fileType = uploadResult.fileType;
        encryptionMetadata = uploadResult.encryptionMetadata;
      }

      const created = await documentsApi.create({
        title: formData.title,
        description: formData.description,
        fileType,
        fileSize,
        departmentId: formData.departmentId || undefined,
        sensitivity: formData.sensitivity,
        classification: formData.classification,
        securityLevel: formData.securityLevel,
        url: fileUrl,
        encryptionMetadata
      });

      setDocs([...docs, created]);
      setIsModalOpen(false);
      setFormData({ title: '', description: '', fileType: 'PDF', fileSize: '1MB', departmentId: '', sensitivity: 'LOW', classification: 'INTERNAL', securityLevel: 1, url: '' });
      setSelectedFile(null);
      alert('Tao tai lieu thanh cong!');
    } catch (err) {
      console.error('Create document error:', err);
      alert('Tao tai lieu that bai!');
    } finally {
      setUploading(false);
    }
  };

  const clearFilters = () => {
    setFilterSensitivity('ALL');
    setSearchTerm('');
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative">
          <div className="absolute -left-4 top-0 w-1.5 h-full bg-blue-600 rounded-full shadow-[0_0_15px_rgba(37,99,235,0.5)]"></div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight italic uppercase">QUẢN LÝ TÀI LIỆU</h2>
          <p className="text-slate-500 font-medium mt-1">Lưu trữ bảo mật, mã hóa mã nguồn và phân quyền truy cập E2EE</p>
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={() => setShowRequests(!showRequests)}
            className={`relative px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 transition-all ${
              showRequests ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Key size={18} />
            Yêu cầu truy cập
            {requests.filter(r => r.status === 'PENDING').length > 0 && (
              <span className="absolute -top-1 -right-1 flex h-5 w-5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-5 w-5 bg-red-500 text-[10px] items-center justify-center text-white ring-2 ring-white">
                  {requests.filter(r => r.status === 'PENDING').length}
                </span>
              </span>
            )}
          </button>
          <div className="bg-amber-50 px-4 py-2 rounded-2xl border border-amber-100 flex items-center gap-2">
            <ShieldAlert size={18} className="text-amber-500" />
            <span className="text-xs font-bold uppercase tracking-widest text-amber-700">Tài liệu quan trọng: {loading ? '...' : criticalDocs}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
          <input
            type="text"
            placeholder="Tìm tài liệu theo tên hoặc từ khóa..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-2xl py-3.5 pl-12 pr-4 focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm font-medium"
          />
        </div>
        <button onClick={() => setIsFilterOpen(!isFilterOpen)} className={`bg-white border px-6 py-2 rounded-2xl font-bold text-sm flex items-center gap-2 transition-all ${isFilterOpen ? 'border-blue-500 text-blue-600' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
          <Filter size={18} /> Lọc độ nhạy cảm {filterSensitivity !== 'ALL' && <span className="w-2 h-2 bg-blue-500 rounded-full"></span>}
        </button>
        <button onClick={() => setIsModalOpen(true)} className="bg-blue-600 text-white px-6 py-2 rounded-2xl font-bold text-sm flex items-center gap-2 hover:bg-blue-700 transition-all">
          <Plus size={18} /> Thêm tài liệu
        </button>
      </div>

      {/* Filter Panel */}
      {isFilterOpen && (
        <div className="bg-white p-4 md:p-6 rounded-2xl border border-slate-200 shadow-lg animate-in slide-in-from-top-2">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-bold text-slate-800">Lọc tài liệu</h4>
            <button onClick={clearFilters} className="text-sm text-blue-600 hover:underline">Xóa bộ lọc</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">Độ nhạy cảm</label>
              <select value={filterSensitivity} onChange={(e) => setFilterSensitivity(e.target.value)} className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl text-sm">
                <option value="ALL">Tất cả</option>
                <option value="CRITICAL">Critical</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">Bộ phận</label>
              <select className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl text-sm">
                <option value="">Tất cả</option>
                {departments.map(dept => (
                  <option key={dept.id} value={dept.id}>{dept.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">Định dạng</label>
              <select className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl text-sm">
                <option value="">Tất cả</option>
                <option value="PDF">PDF</option>
                <option value="DOCX">DOCX</option>
                <option value="XLSX">XLSX</option>
                <option value="PPTX">PPTX</option>
              </select>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left min-w-[900px]">
            <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 text-xs font-bold uppercase tracking-widest">
            <tr>
              <th className="px-4 md:px-8 py-4 md:py-6">Tài liệu / Định dạng</th>
              <th className="px-4 md:px-8 py-4 md:py-6">Bộ phận</th>
              <th className="px-4 md:px-8 py-4 md:py-6">Phân loại bảo mật</th>
              <th className="px-4 md:px-8 py-4 md:py-6">Bảo mật</th>
              <th className="px-4 md:px-8 py-4 md:py-6">Người sở hữu</th>
              <th className="px-4 md:px-8 py-4 md:py-6 text-right">Quyền hạn</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            <AnimatePresence>
              {filteredDocs.length === 0 && !loading ? (
                <motion.tr
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <td colSpan={6} className="py-24 text-center">
                    <div className="flex flex-col items-center justify-center opacity-60">
                      <FileText size={64} className="text-slate-300 mb-4" />
                      <p className="text-lg text-slate-500 font-bold mb-1">Không tìm thấy tài liệu nào</p>
                      <p className="text-slate-400 text-sm">Vui lòng điều chỉnh bộ lọc hoặc tạo tài liệu mới.</p>
                    </div>
                  </td>
                </motion.tr>
              ) : (
                filteredDocs.map((doc, index) => (
                  <motion.tr
                    key={doc.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    className="hover:bg-blue-50/40 transition-all duration-300 group hover:-translate-y-0.5"
                  >
                    <td className="px-4 md:px-8 py-5">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-slate-100 text-slate-400 group-hover:bg-blue-100 group-hover:text-blue-600 rounded-2xl transition-all shadow-sm group-hover:shadow">
                          <FileText size={20} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-800 italic">{doc.title}</p>
                          <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">{doc.fileType || 'PDF'} • {doc.fileSize || '-'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 md:px-8 py-5">
                      <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg uppercase tracking-wider">
                        {doc.departmentName || '-'}
                      </span>
                    </td>
                    <td className="px-4 md:px-8 py-5">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${
                          doc.sensitivity === 'CRITICAL' ? 'bg-rose-500 shadow-rose-500/50 shadow blur-[1px]' :
                          doc.sensitivity === 'HIGH' ? 'bg-amber-500 shadow-amber-500/50 shadow blur-[1px]' : 'bg-emerald-500 shadow-emerald-500/50 shadow blur-[1px]'
                        }`}></div>
                        <span className={`text-xs font-bold uppercase tracking-wider ${
                          doc.sensitivity === 'CRITICAL' ? 'text-rose-600' :
                          doc.sensitivity === 'HIGH' ? 'text-amber-600' : 'text-emerald-600'
                        }`}>
                          {doc.sensitivity}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 md:px-8 py-5">
                      <div className="flex items-center gap-1">
                        {/* Security Level Badge */}
                        <span className={`text-xs font-bold px-3 py-1.5 rounded-lg uppercase tracking-wider ${
                          doc.securityLevel === 3 ? 'bg-rose-100 text-rose-600' :
                          doc.securityLevel === 2 ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-600'
                        }`}>
                          L{doc.securityLevel}
                        </span>
                        {/* Lock Status */}
                        <div className="flex gap-1 ml-1 items-center">
                          {(doc as any).isLocked && (
                            <span title="Bị khóa" className="p-1 rounded bg-rose-50"><Lock size={14} className="text-rose-500" /></span>
                          )}
                          {(doc as any).failedAttempts > 0 && (
                            <span className="text-xs font-bold text-rose-500 bg-rose-50 px-2 py-0.5 rounded" title={`${(doc as any).failedAttempts} lần nhập sai`}>
                              ⚠️{(doc as any).failedAttempts}
                            </span>
                          )}
                        </div>
                        {/* Reset Access Button - Only show if has failed attempts */}
                        {(doc as any).failedAttempts >= 3 && hasEditPerm && (
                          <button
                            onClick={() => handleResetAccess(doc)}
                            className="ml-1 p-1.5 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                            title="Mở khóa (sau khi bị khóa do nhập sai)"
                          >
                            <Unlock size={14} />
                          </button>
                        )}
                        {/* Settings Button */}
                        {hasEditPerm && (
                          <button
                            onClick={() => setSecurityModalDoc(doc)}
                            className="ml-1 p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                            title="Cài đặt bảo mật"
                          >
                            <Shield size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-4 md:px-8 py-5 text-sm font-bold text-slate-600">
                      {doc.ownerName || doc.ownerId ? `U-${doc.ownerId?.slice(-4)}` : '-'}
                    </td>
                    <td className="px-4 md:px-8 py-5 text-right">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => setViewingDoc(doc)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 focus:ring-2 focus:ring-blue-100 rounded-xl transition-all">
                          <Eye size={18} />
                        </button>
                        {hasDeletePerm && (
                          <button
                            onClick={() => handleDelete(doc.id)}
                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 focus:ring-2 focus:ring-rose-100 rounded-xl transition-all"
                          >
                            <MoreVertical size={18} />
                          </button>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                ))
              )}
            </AnimatePresence>
          </tbody>
        </table>
        </div>
      </div>

      {/* Add Document Modal */}
      <Modal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setSelectedFile(null); setFormData({ title: '', description: '', fileType: 'PDF', fileSize: '1MB', departmentId: '', sensitivity: 'LOW', classification: 'INTERNAL', securityLevel: 1, url: '' }); }} title="Them tai lieu moi" size="lg">
        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase">Ten tai lieu</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full mt-1 px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="Tai lieu du an ABC"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase">Mo ta</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full mt-1 px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="Mo ta tai lieu..."
              rows={2}
            />
          </div>

          {/* File Upload */}
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase">Tai file len</label>
            <div className={`mt-1 border-2 border-dashed rounded-xl p-4 md:p-6 text-center transition-colors ${
              selectedFile ? 'border-blue-500 bg-blue-50' : 'border-slate-300 hover:border-blue-400'
            }`}>
              <input
                type="file"
                id="file-upload"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) setSelectedFile(file);
                }}
                className="hidden"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.png,.jpg,.jpeg,.gif"
              />
              {selectedFile ? (
                <div className="flex items-center justify-center gap-3">
                  <File className="text-blue-500" size={24} />
                  <div className="text-left">
                    <p className="text-sm font-bold text-slate-700">{selectedFile.name}</p>
                    <p className="text-xs text-slate-500">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      setSelectedFile(null);
                    }}
                    className="p-1 hover:bg-slate-200 rounded"
                  >
                    <X size={18} className="text-slate-500" />
                  </button>
                </div>
              ) : (
                <label htmlFor="file-upload" className="cursor-pointer">
                  <Upload className="mx-auto text-slate-400 mb-2" size={32} />
                  <p className="text-sm text-slate-500">Click de chon file</p>
                  <p className="text-xs text-slate-400 mt-1">PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT, PNG, JPG (max 50MB)</p>
                </label>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">Bo phan</label>
              <select
                value={formData.departmentId}
                onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                className="w-full mt-1 px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="">Chon bo phan</option>
                {departments.map(dept => (
                  <option key={dept.id} value={dept.id}>{dept.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">Do nhay cam</label>
              <select
                value={formData.sensitivity}
                onChange={(e) => setFormData({ ...formData, sensitivity: e.target.value })}
                className="w-full mt-1 px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="CRITICAL">Critical</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">Phan loai bao mat</label>
              <select
                value={formData.classification}
                onChange={(e) => setFormData({ ...formData, classification: e.target.value })}
                className="w-full mt-1 px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="PUBLIC">Public</option>
                <option value="INTERNAL">Internal</option>
                <option value="CONFIDENTIAL">Confidential</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">Muc do bao mat</label>
              <select
                value={formData.securityLevel}
                onChange={(e) => setFormData({ ...formData, securityLevel: parseInt(e.target.value) })}
                className="w-full mt-1 px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value={1}>Level 1 - Low</option>
                <option value={2}>Level 2 - Medium</option>
                <option value={3}>Level 3 - High</option>
              </select>
            </div>
          </div>
          <button
            onClick={handleCreateDoc}
            disabled={!formData.title || uploading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2"
          >
            {uploading ? (
              <>
                <Upload className="animate-spin" size={18} /> Dang tai len...
              </>
            ) : (
              <>
                <Upload size={18} /> Tao tai lieu
              </>
            )}
          </button>
        </div>
      </Modal>

      {/* Document Viewer Modal - Secure Streaming */}
      <DocumentViewerModal
        document={viewingDoc}
        isOpen={!!viewingDoc}
        onClose={() => setViewingDoc(null)}
        onDownload={undefined}
        onRequestAccess={async (doc: Document, reason: string) => {
          await documentsApi.requestAccess(doc.id, reason);
          alert('Yêu cầu đã được gửi! Admin sẽ xem xét sớm.');
        }}
        user={user ? { id: user.id || '', name: user.name || '', email: user.email || '', role: user.role || '' } : undefined}
      />

      {/* Security Settings Modal - Enhanced DRM */}
      <Modal isOpen={!!securityModalDoc} onClose={() => { setSecurityModalDoc(null); setPasswordInput(''); }} title="Cài đặt bảo mật tài liệu" size="lg">
        {securityModalDoc && (
          <div className="space-y-5">
            <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl">
              <div className="p-4 bg-blue-100 text-blue-600 rounded-xl">
                <Shield size={32} />
              </div>
              <div>
                <h4 className="font-bold text-slate-800">{securityModalDoc.title}</h4>
                <p className="text-sm text-slate-500">
                  Mức độ bảo mật: Level {securityModalDoc.securityLevel || 1} • {securityModalDoc.classification || 'INTERNAL'}
                </p>
              </div>
            </div>

            {/* Lock Status */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-slate-50 rounded-xl">
                <p className="text-xs font-bold text-slate-400 uppercase">Trạng thái khóa</p>
                <p className="font-bold text-slate-700 flex items-center gap-2 mt-1">
                  {(securityModalDoc as any).isLocked ? (
                    <><Lock size={14} className="text-rose-500" /> Bị khóa</>
                  ) : (
                    <><Unlock size={14} className="text-emerald-500" /> Mở khóa</>
                  )}
                </p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <p className="text-xs font-bold text-slate-400 uppercase">DRM</p>
                <p className="font-bold text-slate-700 flex items-center gap-2 mt-1">
                  {securityModalDoc.drm?.enabled ? (
                    <><Shield size={14} className="text-emerald-500" /> Đã bật</>
                  ) : (
                    <><Shield size={14} className="text-slate-300" /> Chưa bật</>
                  )}
                </p>
              </div>
            </div>

            {/* Lock/Unlock Buttons */}
            <div className="flex gap-2">
              {(securityModalDoc as any).isLocked ? (
                <button
                  onClick={() => { handleToggleLock(securityModalDoc, false); setSecurityModalDoc(null); }}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2"
                >
                  <Unlock size={18} /> Mở khóa tài liệu
                </button>
              ) : (
                <button
                  onClick={() => { handleToggleLock(securityModalDoc, true); setSecurityModalDoc(null); }}
                  className="flex-1 bg-rose-600 hover:bg-rose-700 text-white py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2"
                >
                  <Lock size={18} /> Khóa tài liệu
                </button>
              )}
            </div>

            {/* DRM Policy Info */}
            {securityModalDoc.drm?.enabled && securityModalDoc.drm.policy && (
              <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                <h5 className="text-xs font-black text-emerald-700 uppercase mb-3 flex items-center gap-2">
                  <Shield size={14} /> Chính sách DRM hiện tại
                </h5>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    ['Xem', securityModalDoc.drm.policy.view],
                    ['Tải', securityModalDoc.drm.policy.download],
                    ['In', securityModalDoc.drm.policy.print],
                    ['Copy', securityModalDoc.drm.policy.copy],
                    ['Chỉnh sửa', securityModalDoc.drm.policy.edit],
                    ['Chia sẻ', securityModalDoc.drm.policy.share],
                  ].map(([label, allowed]) => (
                    <div key={label as string} className="flex items-center gap-1.5">
                      <div className={`w-4 h-4 rounded flex items-center justify-center ${allowed ? 'bg-emerald-500 text-white' : 'bg-rose-100 text-rose-500'}`}>
                        {allowed ? <span className="text-[8px]">✓</span> : <span className="text-[8px]">✗</span>}
                      </div>
                      <span className="text-xs font-medium text-slate-600">{label as string}</span>
                    </div>
                  ))}
                </div>
                {securityModalDoc.drm.printLimit && (
                  <p className="text-xs text-emerald-600 mt-2 font-medium">
                    Giới hạn in: {securityModalDoc.drm.printLimit} trang
                  </p>
                )}
                {securityModalDoc.drm.expiresAt && (
                  <p className="text-xs text-emerald-600 font-medium">
                    Hết hạn: {new Date(securityModalDoc.drm.expiresAt).toLocaleDateString('vi-VN')}
                  </p>
                )}
                {securityModalDoc.drm.watermark && (
                  <p className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                    <Shield size={10} /> Có watermark bảo mật
                  </p>
                )}
              </div>
            )}

            {/* Classification Info */}
            <div className="p-3 bg-slate-50 rounded-xl">
              <p className="text-xs font-bold text-slate-400 uppercase">Phân loại tài liệu</p>
              <div className="flex items-center gap-2 mt-2">
                <span className={`text-xs font-black px-2 py-1 rounded ${
                  securityModalDoc.classification === 'CONFIDENTIAL' ? 'bg-rose-100 text-rose-600' :
                  securityModalDoc.classification === 'INTERNAL' ? 'bg-amber-100 text-amber-600' :
                  'bg-slate-100 text-slate-600'
                }`}>
                  {securityModalDoc.classification}
                </span>
                <span className="text-xs text-slate-500">
                  {securityModalDoc.classification === 'CONFIDENTIAL' && 'Watermark bắt buộc, không copy, không in'}
                  {securityModalDoc.classification === 'INTERNAL' && 'Watermark nếu level 3, không share'}
                  {securityModalDoc.classification === 'PUBLIC' && 'Full access'}
                </span>
              </div>
            </div>

            {/* Watermark & Fingerprint Info */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-sky-50 rounded-xl">
                <p className="text-xs font-bold text-sky-400 uppercase">Watermark</p>
                <p className="text-xs font-medium text-sky-700 mt-1">
                  {securityModalDoc.watermarkId ? `ID: ${securityModalDoc.watermarkId.slice(0, 8)}...` : 'Chưa có watermark'}
                </p>
              </div>
              <div className="p-3 bg-purple-50 rounded-xl">
                <p className="text-xs font-bold text-purple-400 uppercase">Fingerprint</p>
                <p className="text-xs font-medium text-purple-700 mt-1">
                  {securityModalDoc.fingerprint ? `${securityModalDoc.fingerprint.slice(0, 8)}...` : 'Chưa có fingerprint'}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-400 text-center">
              Tài liệu bị khóa sẽ không thể xem hoặc tải xuống cho đến khi được mở khóa
            </p>
          </div>
        )}
      </Modal>

      {/* Access Requests Modal */}
      <Modal isOpen={showRequests} onClose={() => setShowRequests(false)} title="Phê duyệt yêu cầu truy cập" size="lg">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="bg-blue-100 text-blue-700 text-xs px-3 py-1.5 rounded-full font-bold shadow-sm">
              {requests.filter((r: any) => r.status === 'PENDING').length} chờ duyệt
            </span>
            <button onClick={loadRequests} className="text-sm text-blue-600 font-bold hover:underline">
              Làm mới
            </button>
          </div>

          {requestLoading ? (
            <div className="p-4 md:p-8 text-center text-slate-400 bg-slate-50 rounded-xl font-medium">Đang tải...</div>
          ) : requests.length === 0 ? (
            <div className="p-4 md:p-8 text-center text-slate-400 bg-slate-50 rounded-xl font-medium">Không có yêu cầu nào</div>
          ) : (
            <div className="divide-y divide-slate-100 bg-white border border-slate-100 rounded-xl overflow-hidden shadow-sm max-h-[60vh] overflow-y-auto">
              {requests.map((request: any) => (
                <div key={request._id || request.id} className="p-4 hover:bg-slate-50">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[10px] font-bold px-2 py-1 rounded ${
                          request.status === 'PENDING' ? 'bg-amber-50 text-amber-600' :
                          request.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-600' :
                          'bg-rose-50 text-rose-600'
                        }`}>
                          {request.status === 'PENDING' ? 'Chờ duyệt' :
                           request.status === 'APPROVED' ? 'Đã duyệt' : 'Đã từ chối'}
                        </span>
                        <span className="text-xs text-slate-400">
                          {new Date(request.createdAt).toLocaleDateString('vi-VN', {
                            day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
                          })}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-slate-700">
                        Người yêu cầu: {getUserName(request.userId)}
                      </p>
                      <p className="text-sm text-slate-600">
                        Tài liệu: {getDocTitle(request.documentId)}
                      </p>
                      {request.reason && (
                        <p className="text-sm text-slate-500 mt-1 italic">Lý do: {request.reason}</p>
                      )}
                      {request.status === 'REJECTED' && request.rejectReason && (
                        <p className="text-sm text-rose-500 mt-1">Lý do từ chối: {request.rejectReason}</p>
                      )}
                    </div>

                    {request.status === 'PENDING' && hasApprovePerm && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleApproveRequest(request._id || request.id)}
                          className="px-3 py-1.5 bg-emerald-500 text-white text-sm rounded-lg font-medium hover:bg-emerald-600 transition-colors"
                        >
                          Duyệt
                        </button>
                        <button
                          onClick={() => setSelectedRequest(request)}
                          className="px-3 py-1.5 bg-rose-500 text-white text-sm rounded-lg font-medium hover:bg-rose-600 transition-colors"
                        >
                          Từ chối
                        </button>
                      </div>
                    )}

                    {request.status === 'APPROVED' && hasApprovePerm && (
                      <button
                        onClick={() => handleRevokeAccess(request._id || request.id)}
                        className="px-3 py-1.5 bg-amber-500 text-white text-sm rounded-lg font-medium hover:bg-amber-600 transition-colors"
                      >
                        Thu hồi
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>

      {/* Reject Reason Modal */}
      <Modal isOpen={!!selectedRequest} onClose={() => { setSelectedRequest(null); setRejectReason(''); }} title="Từ chối yêu cầu">
        {selectedRequest && (
          <div className="space-y-4">
            <div className="p-4 bg-rose-50 rounded-xl border border-rose-100">
              <p className="text-sm font-medium text-slate-700">
                Người yêu cầu: {selectedRequest.userId?.name || selectedRequest.userName || 'N/A'}
              </p>
              <p className="text-sm text-slate-600">
                Tài liệu: {selectedRequest.documentId?.title || selectedRequest.documentId?.name || selectedRequest.documentTitle || selectedRequest.documentId}
              </p>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">Lý do từ chối</label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Nhập lý do từ chối..."
                className="w-full mt-1 px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500 outline-none"
                rows={3}
                autoFocus
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => { setSelectedRequest(null); setRejectReason(''); }}
                className="flex-1 py-3 border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50 transition-all"
              >
                Hủy
              </button>
              <button
                onClick={() => handleRejectRequest(selectedRequest._id || selectedRequest.id)}
                className="flex-1 py-3 bg-rose-500 text-white rounded-xl font-bold hover:bg-rose-600 transition-all"
              >
                Từ chối
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
