
import React from 'react';
import { Link } from 'react-router-dom';
import { Users, AlertCircle, FileText, Monitor, ArrowUpRight, Zap, ShieldAlert, Activity, LayoutGrid, ArrowRight } from 'lucide-react';
import { StaffStatsCard } from '../../components/Manager/StaffStatsCard';
import { DocumentActivityChart } from '../../components/Manager/DocumentActivityChart';
import { MOCK_USERS, MOCK_PROJECTS } from '../../mockData';

export const ManagerDashboard: React.FC = () => {
  const departmentStaff = MOCK_USERS.filter(u => u.role !== 'ADMIN');
  const onlineStaff = departmentStaff.filter(u => u.status === 'ACTIVE');
  const departmentProjects = MOCK_PROJECTS.filter(p => p.department === 'Engineering');

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight uppercase italic text-sky-600">Manager Insights</h2>
          <p className="text-slate-500 text-sm font-medium">Báo cáo thời gian thực về tình trạng an ninh và hoạt động của bộ phận</p>
        </div>
        <div className="flex gap-2">
           <div className="bg-sky-50 px-4 py-2.5 rounded-2xl border border-sky-100 flex items-center gap-2">
            <Activity size={18} className="text-sky-500" />
            <span className="text-[11px] font-black uppercase tracking-widest text-sky-700">System Status: Active</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StaffStatsCard 
          title="Staff trực tuyến" 
          value={onlineStaff.length} 
          subtitle={`Trên tổng số ${departmentStaff.length} nhân viên`} 
          icon={<Monitor size={20}/>} 
          color="bg-sky-500"
        />
        <StaffStatsCard 
          title="Truy cập rủi ro" 
          value="0" 
          subtitle="Không có hành vi bất thường" 
          icon={<ShieldAlert size={20}/>} 
          color="bg-rose-500"
        />
        <StaffStatsCard 
          title="Tài liệu phê duyệt" 
          value="3" 
          subtitle="Cần xem xét trong hôm nay" 
          icon={<FileText size={20}/>} 
          color="bg-indigo-500"
        />
        <StaffStatsCard 
          title="Xác thực 2FA" 
          value="100%" 
          subtitle="Tuân thủ chính sách Zero Trust" 
          icon={<Zap size={20}/>} 
          color="bg-emerald-500"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Projects Section */}
          <div className="bg-white p-8 rounded-[40px] border border-sky-50 shadow-sm">
            <div className="flex justify-between items-center mb-8">
              <h3 className="font-black text-slate-700 uppercase text-xs tracking-widest flex items-center gap-2">
                <LayoutGrid size={18} className="text-sky-500" /> Dự án bộ phận
              </h3>
              <Link to="/manager/reports" className="text-[10px] font-black text-sky-600 uppercase tracking-widest hover:underline">Xem báo cáo</Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {departmentProjects.map(project => (
                <Link 
                  key={project.id} 
                  to={`/projects/${project.id}`}
                  className="p-5 rounded-3xl border border-slate-50 hover:border-sky-100 hover:bg-sky-50/30 transition-all group"
                >
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="font-bold text-slate-800 text-sm group-hover:text-sky-600 transition-colors">{project.title}</h4>
                    <span className="text-[9px] font-black text-sky-500 bg-sky-50 px-2 py-0.5 rounded uppercase">{project.progress}%</span>
                  </div>
                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mb-3">
                    <div className="bg-sky-500 h-full" style={{ width: `${project.progress}%` }}></div>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex -space-x-1.5">
                      {project.members.slice(0, 3).map(mId => (
                        <img key={mId} src={`https://picsum.photos/seed/${mId}/200`} className="w-5 h-5 rounded-full border border-white" />
                      ))}
                    </div>
                    <ArrowRight size={14} className="text-slate-300 group-hover:text-sky-500 transition-colors" />
                  </div>
                </Link>
              ))}
            </div>
          </div>

          <div className="bg-white p-8 rounded-[40px] border border-sky-50 shadow-sm">
            <div className="flex justify-between items-center mb-8">
              <h3 className="font-black text-slate-700 uppercase text-xs tracking-widest flex items-center gap-2">
                <FileText size={18} className="text-sky-500" />
                Lưu lượng truy cập tài liệu
              </h3>
              <div className="flex gap-2">
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase">
                  <div className="w-2.5 h-2.5 bg-sky-500 rounded-full"></div> Views
                </div>
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase">
                  <div className="w-2.5 h-2.5 bg-indigo-500 rounded-full"></div> Downloads
                </div>
              </div>
            </div>
            <DocumentActivityChart />
          </div>

          <div className="bg-sky-900 p-8 rounded-[40px] text-white relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 right-0 p-8 opacity-10">
              <ShieldAlert size={80} />
            </div>
            <h3 className="font-black text-xs uppercase tracking-widest text-sky-400 mb-4">Security Advisory</h3>
            <p className="text-sm text-sky-100 leading-relaxed mb-6">
              Phát hiện một thiết bị mới cố gắng truy cập từ dải IP không xác định trong bộ phận Engineering. Hãy kiểm tra danh sách Staff ngay lập tức.
            </p>
            <button className="bg-white text-sky-900 px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-sky-50 transition-all shadow-xl">
              Kiểm tra ngay
            </button>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[40px] border border-sky-50 shadow-sm">
          <h3 className="font-black text-slate-700 mb-6 uppercase text-xs tracking-widest flex items-center gap-2">
            <Users size={18} className="text-sky-500" />
            Nhân sự trực tuyến
          </h3>
          <div className="space-y-5">
            {onlineStaff.map(staff => (
              <div key={staff.id} className="flex items-center justify-between group p-2 hover:bg-sky-50 rounded-2xl transition-all border border-transparent hover:border-sky-100">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <img src={staff.avatar} className="w-10 h-10 rounded-xl object-cover ring-2 ring-white shadow-sm" />
                    <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full"></div>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800">{staff.name}</p>
                    <p className="text-[10px] text-slate-400 font-medium">{staff.device}</p>
                  </div>
                </div>
                <button className="p-2 text-slate-300 group-hover:text-sky-600 transition-colors">
                  <ArrowUpRight size={16} />
                </button>
              </div>
            ))}
          </div>
          <button className="w-full mt-8 py-3.5 text-sky-600 font-black text-[10px] uppercase tracking-widest border border-sky-100 rounded-2xl hover:bg-sky-50 transition-all">
            Xem tất cả nhân sự
          </button>
        </div>
      </div>
    </div>
  );
};
