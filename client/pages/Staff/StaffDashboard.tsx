
import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { documentsApi } from '../../api';
import { Document } from '../../types';
import { ShieldCheck, FileText, Zap, Clock, CheckCircle2, LayoutGrid, ArrowRight, Lock, Key, Users } from 'lucide-react';
import { DocumentViewerModal } from '../../components/Staff/DocumentViewerModal';
import { Modal } from '../../components/Admin/Modal';

export const StaffDashboard: React.FC = () => {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewingDoc, setViewingDoc] = useState<Document | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const docsData = await documentsApi.getAll();
        // Handle both array and { documents: [] } response
        if (Array.isArray(docsData)) {
          setDocuments(docsData);
        } else if (docsData?.documents) {
          setDocuments(docsData.documents);
        } else {
          setDocuments([]);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleViewDoc = async (doc: Document) => {
    setViewingDoc(doc);
  };

  if (!user?.departmentId && user?.role !== 'ADMIN') {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-4 md:p-8 animate-in fade-in zoom-in duration-700">
        <div className="w-24 h-24 bg-amber-50 text-amber-500 rounded-[32px] flex items-center justify-center mb-8 border border-amber-100 shadow-sm relative overflow-hidden group">
          <div className="absolute inset-0 bg-amber-400/5 translate-y-12 group-hover:translate-y-0 transition-transform duration-700"></div>
          <Users size={40} className="relative z-10" />
        </div>
        <h2 className="text-3xl font-black text-slate-800 tracking-tight text-center max-w-md">Chào mừng, {user?.name}</h2>
        <p className="text-slate-500 text-center mt-3 max-w-sm leading-relaxed">
          Tài khoản của bạn đã được kích hoạt, nhưng chưa được phân công vào bộ phận cụ thể. 
        </p>
        <div className="mt-8 p-4 md:p-6 bg-blue-50 border border-blue-100 rounded-2xl flex items-start gap-4 max-w-md">
          <Zap className="text-blue-600 shrink-0 mt-1" size={20} />
          <p className="text-sm text-blue-700 leading-relaxed font-medium">
            VUI LÒNG LIÊN HỆ VỚI QUẢN TRỊ VIÊN (ADMIN) ĐỂ ĐƯỢC PHÂN PHỐI BỘ PHẬN VÀ TRUY CẬP TÀI LIỆU.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-800">Xin chào, {user?.name || 'User'}</h2>
          <p className="text-slate-500 mt-1">Đây là hoạt động và tài liệu của bạn hôm nay</p>
        </div>
        <div className="flex gap-3">
          {user?.mfaEnabled ? (
            <div className="bg-emerald-50 px-4 py-2 rounded-xl border border-emerald-100 flex items-center gap-2">
              <ShieldCheck size={18} className="text-emerald-500" />
              <span className="text-xs font-bold text-emerald-700">2FA Bật</span>
            </div>
          ) : (
            <div className="bg-amber-50 px-4 py-2 rounded-xl border border-amber-100 flex items-center gap-2">
              <Zap size={18} className="text-amber-500" />
              <span className="text-xs font-bold text-amber-700">Chưa bật 2FA</span>
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white p-4 md:p-6 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-violet-100 text-violet-600 rounded-xl flex items-center justify-center">
              <FileText size={24} />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-bold uppercase">Tài liệu</p>
              <p className="text-2xl font-black text-slate-800">{loading ? '...' : documents.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 md:p-6 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center">
              <CheckCircle2 size={24} />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-bold uppercase">Điểm tin cậy</p>
              <p className="text-2xl font-black text-slate-800">{user?.trustScore || 0}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 md:p-6 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center">
              <Clock size={24} />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-bold uppercase">Đăng nhập</p>
              <p className="text-lg font-black text-slate-800">{(user as any)?.lastLogin ? new Date((user as any).lastLogin).toLocaleDateString('vi-VN') : 'N/A'}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-8">
        <div className="lg:col-span-2 space-y-6">
          {/* Documents */}
          <div className="bg-white p-4 md:p-6 rounded-2xl border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-slate-800">Tài liệu gần đây</h3>
            </div>
            <div className="space-y-3">
              {documents.slice(0, 8).map(doc => {
                const docName = doc.title || (doc as any).name || 'Không có tiêu đề';
                const docDate = doc.createdAt ? new Date(doc.createdAt).toLocaleDateString('vi-VN') : '';
                const docSize = doc.fileSize || (doc as any).size || '';
                const isLocked = doc.isLocked;
                const sensitivity = doc.sensitivity || 'LOW';

                const getSensitivityColor = (level: string) => {
                  switch (level) {
                    case 'CRITICAL': return 'bg-rose-100 text-rose-700 border-rose-200';
                    case 'HIGH': return 'bg-amber-100 text-amber-700 border-amber-200';
                    case 'MEDIUM': return 'bg-sky-100 text-sky-700 border-sky-200';
                    default: return 'bg-emerald-100 text-emerald-700 border-emerald-200';
                  }
                };

                return (
                <div
                  key={doc.id}
                  onClick={() => handleViewDoc(doc)}
                  className="flex items-center justify-between p-4 bg-slate-50 rounded-xl hover:bg-slate-100 cursor-pointer transition-all hover:shadow-md group"
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-xl ${isLocked ? 'bg-red-100' : 'bg-blue-100'}`}>
                      <FileText size={20} className={isLocked ? 'text-red-500' : 'text-blue-500'} />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-700 group-hover:text-blue-600 transition-colors">{docName}</p>
                      <p className="text-xs text-slate-400">{docDate} {docSize && `• ${docSize}`}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {isLocked && (
                      <span className="flex items-center gap-1 text-xs bg-red-50 text-red-600 px-3 py-1.5 rounded-lg font-medium border border-red-100">
                        <Lock size={12} /> Bị khóa
                      </span>
                    )}
                    <span className={`text-xs font-bold px-3 py-1.5 rounded-lg border ${getSensitivityColor(sensitivity)}`}>
                      {sensitivity}
                    </span>
                  </div>
                </div>
              )})}
              {documents.length === 0 && !loading && (
                <div className="text-center py-8">
                  <FileText size={40} className="mx-auto text-slate-300 mb-2" />
                  <p className="text-slate-400 text-sm">Chưa có tài liệu nào</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Personal Info */}
          <div className="bg-white p-4 md:p-6 rounded-2xl border border-slate-100 shadow-sm">
            <h3 className="font-bold text-slate-800 mb-4">Thông tin tài khoản</h3>
            <div className="space-y-3">
              <div className="p-3 bg-slate-50 rounded-xl">
                <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Họ và tên</p>
                <p className="text-sm font-bold text-slate-800">{user?.name}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Email</p>
                <p className="text-sm font-bold text-slate-800">{user?.email}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Bộ phận</p>
                <p className="text-sm font-bold text-blue-600">{user?.department || 'Chưa phân phối'}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Vai trò</p>
                <p className="text-sm font-bold text-emerald-600">{user?.role}</p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-6 rounded-3xl text-white shadow-lg shadow-blue-500/20">
            <h4 className="font-bold mb-2 flex items-center gap-2">
              <ShieldCheck size={20} /> Bảo mật
            </h4>
            <p className="text-xs text-blue-100 leading-relaxed">
              Tài khoản được bảo vệ bởi cơ chế Zero Trust. Mọi hoạt động truy cập tài liệu đều được mã hóa đầu cuối (E2EE) và ghi nhận nhật ký bảo mật.
            </p>
          </div>
        </div>
      </div>

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
        user={user ? { id: user.id, name: user.name, email: user.email, role: user.role } : undefined}
      />
    </div>
  );
};
