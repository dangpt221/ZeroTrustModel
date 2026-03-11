
import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { projectsApi, documentsApi } from '../../api';
import { Document } from '../../types';
import { ShieldCheck, FileText, Zap, Clock, CheckCircle2, LayoutGrid, ArrowRight } from 'lucide-react';
import { DocumentContent } from '../../components/Staff/DocumentContent';

export const StaffDashboard: React.FC = () => {
  const { user } = useAuth();
  const [projects, setProjects] = useState<any[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewingDoc, setViewingDoc] = useState<Document | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [projectsData, docsData] = await Promise.all([
          projectsApi.getAll(),
          documentsApi.getAll()
        ]);
        setProjects(projectsData || []);
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

  const myProjects = useMemo(() => {
    return projects.filter(p => (p.members || []).includes(user?.id || ''));
  }, [projects, user]);

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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center">
              <LayoutGrid size={24} />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-bold uppercase">Dự án</p>
              <p className="text-2xl font-black text-slate-800">{loading ? '...' : myProjects.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
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
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
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
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center">
              <Clock size={24} />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-bold uppercase">Đăng nhập cuối</p>
              <p className="text-lg font-black text-slate-800">{user?.lastLogin ? new Date(user.lastLogin).toLocaleDateString('vi-VN') : 'N/A'}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Projects */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-slate-800">Dự án của tôi</h3>
              <Link to="/" className="text-blue-600 text-sm font-semibold flex items-center gap-1">
                Xem tất cả <ArrowRight size={16} />
              </Link>
            </div>
            <div className="space-y-4">
              {myProjects.slice(0, 3).map(project => (
                <div key={project.id} className="p-4 bg-slate-50 rounded-xl">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-bold text-slate-700">{project.title}</h4>
                    <span className={`text-[10px] font-bold px-2 py-1 rounded ${
                      project.status === 'IN_PROGRESS' ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {project.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    <span>{project.progress}% complete</span>
                    <div className="flex-1 h-1 bg-slate-200 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500" style={{ width: `${project.progress}%` }}></div>
                    </div>
                  </div>
                </div>
              ))}
              {myProjects.length === 0 && !loading && (
                <p className="text-slate-400 text-sm">Bạn chưa có dự án nào</p>
              )}
            </div>
          </div>

          {/* Documents */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-slate-800">Tài liệu</h3>
            </div>
            <div className="space-y-3">
              {documents.slice(0, 5).map(doc => (
                <div
                  key={doc.id}
                  onClick={() => setViewingDoc(doc)}
                  className="flex items-center justify-between p-4 bg-slate-50 rounded-xl hover:bg-slate-100 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <FileText size={18} className="text-slate-400" />
                    <div>
                      <p className="font-medium text-slate-700">{doc.name}</p>
                      <p className="text-xs text-slate-400">{doc.type} - {doc.size}</p>
                    </div>
                  </div>
                  <span className={`text-xs font-bold px-2 py-1 rounded ${
                    doc.sensitivity === 'HIGH' || doc.sensitivity === 'CRITICAL' ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'
                  }`}>
                    {doc.sensitivity}
                  </span>
                </div>
              ))}
              {documents.length === 0 && !loading && (
                <p className="text-slate-400 text-sm">Chưa có tài liệu nào</p>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            <h3 className="font-bold text-slate-800 mb-4">Thông tin cá nhân</h3>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-slate-400">Email</p>
                <p className="text-sm font-medium text-slate-700">{user?.email}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Phòng ban</p>
                <p className="text-sm font-medium text-slate-700">{user?.department}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Thiết bị</p>
                <p className="text-sm font-medium text-slate-700">{user?.device}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Document Content - Hiển thị trực tiếp trên trang */}
      {viewingDoc && (
        <div className="mt-6">
          <DocumentContent
            document={viewingDoc}
            onClose={() => setViewingDoc(null)}
          />
        </div>
      )}
    </div>
  );
};
