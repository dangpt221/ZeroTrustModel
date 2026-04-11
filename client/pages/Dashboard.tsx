
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
import { motion } from 'framer-motion';
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

  const userProjects = user?.role === 'STAFF'
    ? projects.filter(p => p.members.includes(user.id))
    : projects;

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5 }
    }
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="px-4 sm:px-6 lg:px-10 pb-6 lg:pb-10 space-y-4 lg:space-y-8"
    >
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {projectStats.map((stat) => (
          <motion.div
            key={stat.name}
            variants={itemVariants}
            className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4 sm:gap-5 premium-card"
          >
            <div className={`w-10 h-10 sm:w-12 sm:h-12 ${stat.color} text-white rounded-xl flex items-center justify-center shadow-lg shadow-opacity-20 flex-shrink-0`}>
              {stat.icon}
            </div>
            <div>
              <p className="text-slate-500 text-sm font-medium">{stat.name}</p>
              <p className="text-2xl font-bold text-slate-800">{loading ? '...' : stat.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-8">
        {/* Progress Bar Chart */}
        <motion.div variants={itemVariants} className="lg:col-span-2 bg-white p-4 sm:p-6 lg:p-8 rounded-2xl shadow-sm border border-slate-100 premium-card">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 sm:mb-8">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <TrendingUp size={20} className="text-blue-500" />
              Project Completion Progress
            </h3>
          </div>
          <div className="h-[250px] sm:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <Tooltip
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="progress" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Task Distribution Pie Chart */}
        <motion.div variants={itemVariants} className="bg-white p-4 sm:p-6 lg:p-8 rounded-2xl shadow-sm border border-slate-100 premium-card">
          <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-6 sm:mb-8">
            <Target size={20} className="text-blue-500" />
            Active Task Distribution
          </h3>
          <div className="h-[200px] sm:h-64">
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
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i] }}></div>
                <span className="text-xs text-slate-500 font-medium">{d.name}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Recent Projects List */}
      <motion.div variants={itemVariants} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden premium-card">
        <div className="p-4 sm:p-6 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-800">My Active Projects</h3>
          <Link to="/projects" className="text-blue-600 text-sm font-semibold hover:underline flex items-center">
            View All <ChevronRight size={16} />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-500 text-xs font-semibold uppercase tracking-wider">
              <tr>
                <th className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap">Project Name</th>
                <th className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap">Manager</th>
                <th className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap">Status</th>
                <th className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap">Progress</th>
                <th className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap">Deadline</th>
                <th className="px-4 sm:px-6 py-3 sm:py-4 text-right whitespace-nowrap">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {userProjects.map((project) => (
                <tr key={project.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                    <div className="font-semibold text-slate-800">{project.title}</div>
                    <div className="text-xs text-slate-400">{project.department}</div>
                  </td>
                  <td className="px-4 sm:px-6 py-3 sm:py-4 text-sm text-slate-600 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <img src={`https://picsum.photos/seed/${project.managerId}/200`} className="w-6 h-6 rounded-full" />
                      PM
                    </div>
                  </td>
                  <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                    <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full ${project.status === ProjectStatus.IN_PROGRESS ? 'bg-blue-50 text-blue-600' :
                        project.status === ProjectStatus.COMPLETED ? 'bg-green-50 text-green-600' :
                          'bg-slate-100 text-slate-600'
                       }`}>
                      {project.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                    <div className="w-24 sm:w-32 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-blue-500 h-full" style={{ width: `${project.progress}%` }}></div>
                    </div>
                  </td>
                  <td className="px-4 sm:px-6 py-3 sm:py-4 text-sm text-slate-500 whitespace-nowrap">{project.endDate}</td>
                  <td className="px-4 sm:px-6 py-3 sm:py-4 text-right whitespace-nowrap">
                    <Link to={`/projects/${project.id}`} className="p-2 hover:bg-slate-100 rounded-lg inline-block text-slate-400 hover:text-blue-600">
                      <ChevronRight size={20} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </motion.div>
  );
};
