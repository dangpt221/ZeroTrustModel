
import React, { useEffect, useState } from 'react';
import { documentsApi, departmentsApi } from '../../api';
import { Document } from '../../types';
import { Search, Filter, ShieldAlert, Eye, MoreVertical, FileText, Plus, Download, Upload, X, File, Lock, Unlock, Key, Shield } from 'lucide-react';
import { Modal } from '../../components/Admin/Modal';

export const DocumentManagement: React.FC = () => {
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

      // Upload file if selected
      if (selectedFile) {
        const uploadResult = await documentsApi.uploadFile(selectedFile);
        fileUrl = uploadResult.url;
        fileSize = String(uploadResult.fileSize);
        fileType = uploadResult.fileType;
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
        url: fileUrl
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
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight uppercase italic">Toàn văn tài liệu</h2>
          <p className="text-slate-500 text-sm font-medium">Kiểm soát mức độ nhạy cảm và nhật ký truy cập dữ liệu hệ thống</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowRequests(!showRequests)}
            className={`px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 transition-all ${
              showRequests ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Key size={18} />
            Yêu cầu truy cập
            {requests.filter(r => r.status === 'PENDING').length > 0 && (
              <span className="ml-1 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                {requests.filter(r => r.status === 'PENDING').length}
              </span>
            )}
          </button>
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
        <button onClick={() => setIsFilterOpen(!isFilterOpen)} className={`bg-white border px-6 py-2 rounded-2xl font-bold text-sm flex items-center gap-2 transition-all ${isFilterOpen ? 'border-blue-500 text-blue-600' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
          <Filter size={18} /> Lọc độ nhạy cảm {filterSensitivity !== 'ALL' && <span className="w-2 h-2 bg-blue-500 rounded-full"></span>}
        </button>
        <button onClick={() => setIsModalOpen(true)} className="bg-blue-600 text-white px-6 py-2 rounded-2xl font-bold text-sm flex items-center gap-2 hover:bg-blue-700 transition-all">
          <Plus size={18} /> Thêm tài liệu
        </button>
      </div>

      {/* Filter Panel */}
      {isFilterOpen && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-lg animate-in slide-in-from-top-2">
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

      <div className="bg-white rounded-[32px] shadow-sm border border-slate-100 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 text-[10px] font-black uppercase tracking-widest">
            <tr>
              <th className="px-8 py-6">Tài liệu / Định dạng</th>
              <th className="px-8 py-6">Bộ phận</th>
              <th className="px-8 py-6">Phân loại bảo mật</th>
              <th className="px-8 py-6">Bảo mật</th>
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
                      <p className="text-sm font-bold text-slate-800 italic">{doc.title}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">{doc.fileType || 'PDF'} • {doc.fileSize || '-'}</p>
                    </div>
                  </div>
                </td>
                <td className="px-8 py-5">
                  <span className="text-[10px] font-black text-slate-500 bg-slate-100 px-2 py-1 rounded uppercase tracking-tighter">
                    {doc.departmentName || '-'}
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
                <td className="px-8 py-5">
                  <div className="flex items-center gap-1">
                    {/* Security Level Badge */}
                    <span className={`text-[10px] font-black px-2 py-1 rounded uppercase ${
                      doc.securityLevel === 3 ? 'bg-rose-100 text-rose-600' :
                      doc.securityLevel === 2 ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-600'
                    }`}>
                      L{doc.securityLevel}
                    </span>
                    {/* Lock Status */}
                    <div className="flex gap-1 ml-1">
                      {(doc as any).isLocked && (
                        <Lock size={14} className="text-rose-500" title="Bị khóa" />
                      )}
                      {(doc as any).failedAttempts > 0 && (
                        <span className="text-[10px] text-red-500" title={`${(doc as any).failedAttempts} lần nhập sai`}>
                          ⚠️{(doc as any).failedAttempts}
                        </span>
                      )}
                    </div>
                    {/* Reset Access Button - Only show if has failed attempts */}
                    {(doc as any).failedAttempts >= 3 && (
                      <button
                        onClick={() => handleResetAccess(doc)}
                        className="ml-1 p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                        title="Mở khóa (sau khi bị khóa do nhập sai)"
                      >
                        <Unlock size={14} />
                      </button>
                    )}
                    {/* Settings Button */}
                    <button
                      onClick={() => setSecurityModalDoc(doc)}
                      className="ml-1 p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                      title="Cài đặt bảo mật"
                    >
                      <Shield size={14} />
                    </button>
                  </div>
                </td>
                <td className="px-8 py-5 text-xs font-bold text-slate-600">
                  {doc.ownerName || doc.ownerId ? `U-${doc.ownerId?.slice(-4)}` : '-'}
                </td>
                <td className="px-8 py-5 text-right">
                  <div className="flex justify-end gap-1">
                    <button onClick={() => setViewingDoc(doc)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all">
                      <Eye size={18} />
                    </button>
                    <button className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all">
                      <Download size={18} />
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
            <div className={`mt-1 border-2 border-dashed rounded-xl p-6 text-center transition-colors ${
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

      {/* View Document Modal */}
      <Modal isOpen={!!viewingDoc} onClose={() => setViewingDoc(null)} title="Chi tiet tai lieu">
        {viewingDoc && (
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl">
              <div className="p-4 bg-blue-100 text-blue-600 rounded-xl">
                <FileText size={32} />
              </div>
              <div>
                <h4 className="font-bold text-slate-800">{viewingDoc.title}</h4>
                <p className="text-sm text-slate-500">{viewingDoc.fileType} - {viewingDoc.fileSize}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase">Bo phan</p>
                <p className="font-bold text-slate-700">{viewingDoc.departmentName || '-'}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase">Do nhay cam</p>
                <span className={`text-[10px] font-black px-2 py-1 rounded uppercase ${
                  viewingDoc.sensitivity === 'CRITICAL' ? 'bg-rose-100 text-rose-600' :
                  viewingDoc.sensitivity === 'HIGH' ? 'bg-amber-100 text-amber-600' :
                  'bg-emerald-100 text-emerald-600'
                }`}>
                  {viewingDoc.sensitivity}
                </span>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase">Nguoi so huu</p>
                <p className="font-bold text-slate-700">{viewingDoc.ownerName || '-'}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase">Trang thai</p>
                <span className={`text-[10px] font-black px-2 py-1 rounded uppercase ${
                  viewingDoc.status === 'APPROVED' ? 'bg-green-100 text-green-600' :
                  viewingDoc.status === 'PENDING' ? 'bg-yellow-100 text-yellow-600' :
                  viewingDoc.status === 'REJECTED' ? 'bg-red-100 text-red-600' :
                  'bg-slate-100 text-slate-600'
                }`}>
                  {viewingDoc.status}
                </span>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase">Ngay tao</p>
                <p className="font-bold text-slate-700">{viewingDoc.createdAt ? new Date(viewingDoc.createdAt).toLocaleDateString('vi-VN') : '-'}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase">Phien ban</p>
                <p className="font-bold text-slate-700">v{viewingDoc.currentVersion || 1}</p>
              </div>
            </div>
            <div className="flex gap-2 pt-4">
              <button
                onClick={() => window.open(viewingDoc.url || '#', '_blank')}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2"
              >
                <Download size={18} /> Tai xuong
              </button>
              <button onClick={() => handleDelete(viewingDoc.id)} className="px-6 py-3 border border-rose-200 text-rose-600 rounded-xl font-bold hover:bg-rose-50 transition-all">
                <MoreVertical size={18} />
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Security Settings Modal */}
      <Modal isOpen={!!securityModalDoc} onClose={() => { setSecurityModalDoc(null); setPasswordInput(''); }} title="Cai dat bao mat tai lieu">
        {securityModalDoc && (
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl">
              <div className="p-4 bg-blue-100 text-blue-600 rounded-xl">
                <Shield size={32} />
              </div>
              <div>
                <h4 className="font-bold text-slate-800">{securityModalDoc.title}</h4>
                <p className="text-sm text-slate-500">
                  Muc do bao mat: Level {securityModalDoc.securityLevel}
                </p>
              </div>
            </div>

            {/* Current Status */}
            <div className="p-3 bg-slate-50 rounded-xl">
              <p className="text-xs font-bold text-slate-400 uppercase">Trang thai khoa</p>
              <p className="font-bold text-slate-700 flex items-center gap-2">
                {(securityModalDoc as any).isLocked ? (
                  <>
                    <Lock size={16} className="text-rose-500" /> Bi khoa
                  </>
                ) : (
                  <>
                    <Unlock size={16} className="text-emerald-500" /> Mo khoa
                  </>
                )}
              </p>
            </div>

            {/* Lock/Unlock Buttons */}
            <div className="flex gap-2 pt-2">
              {(securityModalDoc as any).isLocked ? (
                <button
                  onClick={() => { handleToggleLock(securityModalDoc, false); setSecurityModalDoc(null); }}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2"
                >
                  <Unlock size={18} /> Mo khoa tai lieu
                </button>
              ) : (
                <button
                  onClick={() => { handleToggleLock(securityModalDoc, true); setSecurityModalDoc(null); }}
                  className="flex-1 bg-rose-600 hover:bg-rose-700 text-white py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2"
                >
                  <Lock size={18} /> Khoa tai lieu
                </button>
              )}
            </div>

            <p className="text-xs text-slate-400 text-center">
              Tai lieu bi khoa se khong the xem hoac tai xuong duoc cho den khi duoc mo khoa
            </p>
          </div>
        )}
      </Modal>

      {/* Access Requests Panel */}
      {showRequests && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="bg-blue-50 px-6 py-4 border-b border-blue-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Key size={20} className="text-blue-600" />
              <h3 className="font-bold text-slate-800">Yêu cầu truy cập tài liệu</h3>
              <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full font-bold">
                {requests.filter(r => r.status === 'PENDING').length} chờ duyệt
              </span>
            </div>
            <button onClick={loadRequests} className="text-sm text-blue-600 hover:underline">
              Làm mới
            </button>
          </div>

          {requestLoading ? (
            <div className="p-8 text-center text-slate-400">Đang tải...</div>
          ) : requests.length === 0 ? (
            <div className="p-8 text-center text-slate-400">Không có yêu cầu nào</div>
          ) : (
            <div className="divide-y divide-slate-50">
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

                    {request.status === 'PENDING' && (
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

                    {request.status === 'APPROVED' && (
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
      )}

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
