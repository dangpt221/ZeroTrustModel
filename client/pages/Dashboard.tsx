
import React, { useEffect, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { projectsApi } from '../api';
import { Project, ProjectStatus, TaskStatus } from '../types';
import { Link } from 'react-router-dom';
import {
  CheckCircle,
  Clock,
  AlertCircle,
  Briefcase,
  ChevronRight,
  TrendingUp,
  Target
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const projectsData = await projectsApi.getAll();
        setProjects(projectsData || []);

        // Fetch tasks for each project
        const allTasks: any[] = [];
        for (const p of projectsData || []) {
          const projectTasks = await projectsApi.getTasks(p.id);
          allTasks.push(...projectTasks);
        }
        setTasks(allTasks);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const projectStats = [
    { name: 'Total', value: projects.length, icon: <Briefcase size={20} />, color: 'bg-blue-500' },
    { name: 'In Progress', value: projects.filter(p => p.status === ProjectStatus.IN_PROGRESS).length, icon: <Clock size={20} />, color: 'bg-indigo-500' },
    { name: 'Completed', value: projects.filter(p => p.status === ProjectStatus.COMPLETED).length, icon: <CheckCircle size={20} />, color: 'bg-green-500' },
    { name: 'At Risk', value: projects.filter(p => p.status === ProjectStatus.ON_HOLD).length, icon: <AlertCircle size={20} />, color: 'bg-amber-500' },
  ];

  const chartData = projects.slice(0, 5).map(p => ({
    name: p.title.substring(0, 10) + '...',
    progress: p.progress,
  }));

  const pieData = [
    { name: 'Todo', value: tasks.filter(t => t.status === TaskStatus.TODO).length },
    { name: 'In Progress', value: tasks.filter(t => t.status === TaskStatus.IN_PROGRESS).length },
    { name: 'Review', value: tasks.filter(t => t.status === TaskStatus.REVIEW).length },
    { name: 'Done', value: tasks.filter(t => t.status === TaskStatus.DONE).length },
  ];

  const COLORS = ['#94a3b8', '#3b82f6', '#f59e0b', '#22c55e'];

  const userProjects = user?.role === 'MEMBER'
    ? projects.filter(p => p.members.includes(user.id))
    : projects;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {projectStats.map((stat) => (
          <div key={stat.name} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-5">
            <div className={`w-12 h-12 ${stat.color} text-white rounded-xl flex items-center justify-center shadow-lg shadow-opacity-20`}>
              {stat.icon}
            </div>
            <div>
              <p className="text-slate-500 text-sm font-medium">{stat.name}</p>
              <p className="text-2xl font-bold text-slate-800">{loading ? '...' : stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Progress Bar Chart */}
        <div className="lg:col-span-2 bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-8">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <TrendingUp size={20} className="text-blue-500" />
              Project Completion Progress
            </h3>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                <Tooltip
                  cursor={{fill: '#f8fafc'}}
                  contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                />
                <Bar dataKey="progress" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Task Distribution Pie Chart */}
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-8">
            <Target size={20} className="text-blue-500" />
            Active Task Distribution
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-4 mt-4">
            {pieData.map((d, i) => (
              <div key={d.name} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{backgroundColor: COLORS[i]}}></div>
                <span className="text-xs text-slate-500 font-medium">{d.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Projects List */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-800">My Active Projects</h3>
          <Link to="/projects" className="text-blue-600 text-sm font-semibold hover:underline flex items-center">
            View All <ChevronRight size={16} />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-500 text-xs font-semibold uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Project Name</th>
                <th className="px-6 py-4">Manager</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Progress</th>
                <th className="px-6 py-4">Deadline</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {userProjects.map((project) => (
                <tr key={project.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-semibold text-slate-800">{project.title}</div>
                    <div className="text-xs text-slate-400">{project.department}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    <div className="flex items-center gap-2">
                      <img src={`https://picsum.photos/seed/${project.managerId}/200`} className="w-6 h-6 rounded-full" />
                      PM
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full ${
                      project.status === ProjectStatus.IN_PROGRESS ? 'bg-blue-50 text-blue-600' :
                      project.status === ProjectStatus.COMPLETED ? 'bg-green-50 text-green-600' :
                      'bg-slate-100 text-slate-600'
                    }`}>
                      {project.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="w-32 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-blue-500 h-full" style={{width: `${project.progress}%`}}></div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500">{project.endDate}</td>
                  <td className="px-6 py-4 text-right">
                    <Link to={`/projects/${project.id}`} className="p-2 hover:bg-slate-100 rounded-lg inline-block text-slate-400 hover:text-blue-600">
                      <ChevronRight size={20} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
