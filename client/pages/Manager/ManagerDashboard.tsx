
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, AlertCircle, FileText, Monitor, ArrowUpRight, Zap, ShieldAlert, Activity, LayoutGrid, ArrowRight } from 'lucide-react';
import { StaffStatsCard } from '../../components/Manager/StaffStatsCard';
import { DocumentActivityChart } from '../../components/Manager/DocumentActivityChart';
import { usersApi, projectsApi } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { usePermission } from '../../hooks/usePermission';

export const ManagerDashboard: React.FC = () => {
  const { user } = useAuth();
  const { isAdmin, isManager } = usePermission();
  const [staff, setStaff] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Manager's department ID
  const managerDepartmentId = user?.departmentId;

  useEffect(() => {
    const fetchData = async () => {
      try {
        let usersData;
        // Manager gets team members, Admin gets all users
        if (isAdmin) {
          usersData = await usersApi.getAll();
        } else {
          usersData = await usersApi.getTeamMembers();
        }
        const projectsData = await projectsApi.getAll();
        setStaff(usersData || []);
        setProjects(projectsData || []);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [isAdmin, isManager]);

  // Filter staff by department for manager
  const departmentStaff = staff.filter(u => {
    if (isAdmin) return u.role !== 'ADMIN';
    if (isManager && managerDepartmentId) {
      return u.departmentId === managerDepartmentId;
    }
    return u.role !== 'ADMIN';
  });
  const onlineStaff = departmentStaff.filter(u => u.status === 'ACTIVE');
  const departmentProjects = projects.filter(p => p.departmentId === managerDepartmentId || p.department === user?.department);

  if (!user?.departmentId && !isAdmin) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-4 md:p-8 animate-in fade-in zoom-in duration-700">
        <div className="w-24 h-24 bg-sky-50 text-sky-500 rounded-[32px] flex items-center justify-center mb-8 border border-sky-100 shadow-sm relative overflow-hidden group">
          <div className="absolute inset-0 bg-sky-400/5 translate-y-12 group-hover:translate-y-0 transition-transform duration-700"></div>
          <ShieldAlert size={40} className="relative z-10" />
        </div>
        <h2 className="text-3xl font-black text-slate-800 tracking-tight text-center max-w-md italic">Manager: Waiting for Assignment</h2>
        <p className="text-slate-500 text-center mt-3 max-w-sm leading-relaxed">
          Tài khoản quản lý của bạn đã được kích hoạt, nhưng chưa được gán vào bộ phận cụ thể để quản lý.
        </p>
        <div className="mt-8 p-4 md:p-6 bg-sky-50 border border-sky-100 rounded-2xl flex items-start gap-4 max-w-md">
          <AlertCircle className="text-sky-600 shrink-0 mt-1" size={20} />
          <p className="text-sm text-sky-700 leading-relaxed font-medium">
            Vui lòng liên hệ với Quản trị viên hệ thống để được gán vào phòng ban tương ứng.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StaffStatsCard
          title="Tổng nhân viên"
          value={loading ? '...' : departmentStaff.length.toString()}
          trend="+12%"
          isPositive={true}
          icon={<Users size={24} />}
          color="bg-blue-500"
        />
        <StaffStatsCard
          title="Đang hoạt động"
          value={loading ? '...' : onlineStaff.length.toString()}
          trend="+5%"
          isPositive={true}
          icon={<Activity size={24} />}
          color="bg-green-500"
        />
        <StaffStatsCard
          title="Dự án đang triển khai"
          value={loading ? '...' : departmentProjects.length.toString()}
          trend="+2"
          subtitle="dự án mới"
          isPositive={true}
          icon={<LayoutGrid size={24} />}
          color="bg-violet-500"
        />
        <StaffStatsCard
          title="Cảnh báo bảo mật"
          value="2"
          trend="-25%"
          isPositive={true}
          icon={<ShieldAlert size={24} />}
          color="bg-rose-500"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-8">
        {/* Projects Overview */}
        <div className="bg-white p-4 md:p-8 rounded-3xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-slate-800">Dự án của bộ phận</h3>
            <Link to="/manager/projects" className="text-blue-600 text-sm font-semibold flex items-center gap-1">
              Xem tất cả <ArrowRight size={16} />
            </Link>
          </div>
          <div className="space-y-4 min-h-[120px]">
            {departmentProjects.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                <LayoutGrid className="w-12 h-12 mb-3 opacity-50" />
                <p className="text-sm font-medium">Chưa có dự án nào</p>
                <p className="text-xs mt-1">Dự án của bộ phận sẽ hiển thị tại đây</p>
              </div>
            ) : (
              departmentProjects.slice(0, 5).map(project => (
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
              ))
            )}
          </div>
        </div>

        {/* Team Members */}
        <div className="bg-white p-4 md:p-8 rounded-3xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-slate-800">Nhân viên trong bộ phận</h3>
            <Link to="/manager/staff" className="text-blue-600 text-sm font-semibold flex items-center gap-1">
              Quản lý <ArrowRight size={16} />
            </Link>
          </div>
          <div className="space-y-3">
            {departmentStaff.slice(0, 6).map(member => (
              <div key={member.id} className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-xl transition-colors">
                <div className="flex items-center gap-3">
                  <img
                    src={member.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${member.id}`}
                    alt=""
                    className="w-10 h-10 rounded-full object-cover bg-slate-200"
                  />
                  <div>
                    <p className="text-sm font-bold text-slate-700">{member.name}</p>
                    <p className="text-xs text-slate-400">{member.role}</p>
                  </div>
                </div>
                <div className={`w-2 h-2 rounded-full ${member.status === 'ACTIVE' ? 'bg-green-500' : 'bg-slate-300'}`}></div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <DocumentActivityChart />
    </div>
  );
};
