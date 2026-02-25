
import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { MOCK_DOCS, MOCK_PROJECTS } from '../../mockData';
import { DocumentCard } from '../../components/Staff/DocumentCard';
import { DocumentFilter } from '../../components/Staff/DocumentFilter';
import { NotificationCard } from '../../components/Staff/NotificationCard';
import { TwoFactorForm } from '../../components/Staff/TwoFactorForm';
import { DocumentAccessRequestModal } from '../../components/Staff/DocumentAccessRequestModal';
import { SecurityTips } from '../../components/Staff/SecurityTips';
import { ShieldCheck, FileText, Zap, Clock, ShieldAlert, CheckCircle2, Bookmark, LayoutGrid, ArrowRight } from 'lucide-react';
import { Document } from '../../types';

export const StaffDashboard: React.FC = () => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [sensitivityFilter, setSensitivityFilter] = useState('ALL');
  const [mfaModal, setMfaModal] = useState<{ isOpen: boolean; doc: Document | null }>({
    isOpen: false,
    doc: null
  });
  const [requestModal, setRequestModal] = useState<{ isOpen: boolean; doc: Document | null }>({
    isOpen: false,
    doc: null
  });

  const myProjects = useMemo(() => {
    return MOCK_PROJECTS.filter(p => p.members.includes(user?.id || ''));
  }, [user]);

  const filteredDocs = useMemo(() => {
    return MOCK_DOCS.filter(doc => {
      const matchesSearch = doc.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFilter = sensitivityFilter === 'ALL' || doc.sensitivity === sensitivityFilter;
      return matchesSearch && matchesFilter;
    });
  }, [searchTerm, sensitivityFilter]);

  const handleViewDoc = (doc: Document) => {
    if (doc.sensitivity === 'CRITICAL' || doc.sensitivity === 'HIGH') {
      setMfaModal({ isOpen: true, doc });
    } else {
      alert(`Đang mở tài liệu: ${doc.name} trong môi trường bảo mật của Nexus.`);
    }
  };

  const handleVerifyMfa = (code: string) => {
    alert(`Xác thực thành công. Tài liệu ${mfaModal.doc?.name} sẽ được giải mã và mở trong tab bảo mật.`);
    setMfaModal({ isOpen: false, doc: null });
  };

  const handleRequestSubmit = (reason: string, duration: string) => {
    alert(`Yêu cầu truy cập tài liệu ${requestModal.doc?.name} đã được gửi thành công. Manager sẽ nhận được thông báo ngay lập tức.`);
    setRequestModal({ isOpen: false, doc: null });
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div className="relative">
          <h2 className="text-3xl font-black text-slate-800 tracking-tight italic uppercase">
            Nexus Staff <span className="text-emerald-500">Portal</span>
          </h2>
          <p className="text-slate-500 text-sm mt-1 font-medium">Xin chào, {user?.name}. Toàn bộ lưu lượng của bạn được bảo mật bởi Zero Trust Gateway.</p>
        </div>
        <div className="flex items-center gap-3">
           <div className="bg-emerald-50 px-4 py-2.5 rounded-2xl border border-emerald-100 flex items-center gap-2 shadow-sm transition-all hover:shadow-emerald-100">
            <ShieldCheck size={18} className="text-emerald-500" />
            <span className="text-[11px] font-black uppercase tracking-widest text-emerald-700">Device Identity: Verified ({user?.trustScore}%)</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-3 space-y-10">
          {/* Projects Section */}
          <div className="space-y-6">
            <div className="flex items-center justify-between px-2">
              <h3 className="font-black text-slate-800 text-xs uppercase tracking-[0.2em] flex items-center gap-2">
                <LayoutGrid size={18} className="text-emerald-500" /> Dự án đang tham gia
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {myProjects.map(project => (
                <Link 
                  key={project.id} 
                  to={`/projects/${project.id}`}
                  className="bg-white p-6 rounded-[32px] border border-slate-100 hover:border-emerald-200 transition-all group shadow-sm hover:shadow-xl relative overflow-hidden"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                      <LayoutGrid size={24} />
                    </div>
                    <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg uppercase tracking-tighter">
                      {project.status}
                    </span>
                  </div>
                  <h4 className="font-black text-slate-800 text-lg mb-2 group-hover:text-emerald-700 transition-colors italic">{project.title}</h4>
                  <p className="text-xs text-slate-500 line-clamp-2 mb-6 font-medium leading-relaxed">{project.description}</p>
                  <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                    <div className="flex -space-x-2">
                      {project.members.slice(0, 3).map(mId => (
                        <img key={mId} src={`https://picsum.photos/seed/${mId}/200`} className="w-6 h-6 rounded-full border-2 border-white" />
                      ))}
                    </div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1 group-hover:text-emerald-600 transition-colors">
                      Chi tiết <ArrowRight size={12} />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Documents Section */}
          <div className="space-y-6">
            <div className="flex items-center justify-between px-2">
              <h3 className="font-black text-slate-800 text-xs uppercase tracking-[0.2em] flex items-center gap-2">
                <FileText size={18} className="text-emerald-500" /> Thư viện tài nguyên
              </h3>
            <div className="flex gap-4">
               <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                 <div className="w-2 h-2 rounded-full bg-emerald-500"></div> Đã phê duyệt
               </span>
               <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                 <div className="w-2 h-2 rounded-full bg-amber-500"></div> Cần yêu cầu
               </span>
            </div>
          </div>
          
          <DocumentFilter onSearch={setSearchTerm} onFilterChange={setSensitivityFilter} />
          
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredDocs.map(doc => (
              <DocumentCard 
                key={doc.id} 
                doc={doc} 
                onView={handleViewDoc} 
                onRequestAccess={(doc) => setRequestModal({ isOpen: true, doc })} 
              />
            ))}
            {filteredDocs.length === 0 && (
              <div className="col-span-full py-32 text-center bg-white rounded-[40px] border border-dashed border-slate-200">
                <FileText className="mx-auto text-slate-100 mb-6" size={80} />
                <p className="text-slate-400 font-bold italic text-lg">Hệ thống Nexus không tìm thấy tài liệu phù hợp.</p>
                <button 
                  onClick={() => { setSearchTerm(''); setSensitivityFilter('ALL'); }}
                  className="mt-6 text-emerald-600 font-black text-[10px] uppercase tracking-widest hover:underline"
                >
                  Xóa bộ lọc và tìm lại
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-8">
          <SecurityTips />

          <div className="bg-slate-900 p-8 rounded-[40px] text-white relative overflow-hidden shadow-2xl">
             <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl"></div>
             <div className="relative z-10">
               <div className="flex items-center gap-2 mb-6">
                 <div className="p-2 bg-emerald-500/20 rounded-xl">
                   <Bookmark size={20} className="text-emerald-400" />
                 </div>
                 <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Đã đánh dấu</span>
               </div>
               <div className="space-y-3">
                 <p className="text-[11px] text-slate-400 font-medium italic">Bạn chưa có tài liệu nào được đánh dấu bookmark trong bộ phận này.</p>
               </div>
             </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-black text-slate-800 flex items-center gap-2 text-xs uppercase tracking-widest px-2">
              <Clock size={16} className="text-emerald-500" /> Thông báo SOC
            </h3>
            <div className="space-y-3">
              <NotificationCard 
                type="SUCCESS" 
                message="Phiên làm việc bảo mật đã được gia hạn." 
                time="Mới đây"
              />
              <NotificationCard 
                type="INFO" 
                message="Chính sách bảo mật tài liệu v3.0 đã áp dụng." 
                time="2 giờ trước"
              />
              <NotificationCard 
                type="WARNING" 
                message="Có 1 yêu cầu truy cập JIT đang chờ Manager." 
                time="4 giờ trước"
              />
            </div>
            <button className="w-full py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-emerald-600 transition-all">
              Xem toàn bộ thông báo
            </button>
          </div>
        </div>
      </div>

      <TwoFactorForm 
        isOpen={mfaModal.isOpen} 
        onClose={() => setMfaModal({ isOpen: false, doc: null })} 
        onVerify={handleVerifyMfa}
        docName={mfaModal.doc?.name || ''}
      />

      <DocumentAccessRequestModal 
        isOpen={requestModal.isOpen}
        onClose={() => setRequestModal({ isOpen: false, doc: null })}
        document={requestModal.doc}
        onSubmit={handleRequestSubmit}
      />
    </div>
  );
};
