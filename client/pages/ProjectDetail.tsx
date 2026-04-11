
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { projectsApi, documentsApi } from '../api';
import { Project, TaskStatus, Document } from '../types';
import {
  ArrowLeft,
  Plus,
  Calendar,
  User,
  FileText,
  CheckSquare,
  Users,
  MessageCircle,
  Download,
  Upload,
  AlertCircle
} from 'lucide-react';

export const ProjectDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [docs, setDocs] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<'tasks' | 'docs' | 'team'>('tasks');

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      try {
        const [projectData, tasksData] = await Promise.all([
          projectsApi.getById(id),
          projectsApi.getTasks(id)
        ]);
        setProject(projectData);
        setTasks(tasksData || []);

        // Fetch all documents and filter
        const allDocs = await documentsApi.getAll();
        setDocs((allDocs || []).filter((d: any) => d.projectId === id));
      } catch (error) {
        console.error('Error fetching project:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  if (loading) return <div className="p-4 md:p-8">Loading...</div>;
  if (!project) return <div className="p-4 md:p-8">Project not found</div>;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Link to="/" className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors text-sm font-medium">
        <ArrowLeft size={16} /> Back to Dashboard
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-8">
        {/* Project Info */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-4 md:p-8 rounded-3xl border border-slate-100 shadow-sm">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-2xl font-black text-slate-800">{project.title}</h2>
                <p className="text-slate-500 mt-1">{project.description}</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                project.status === 'IN_PROGRESS' ? 'bg-blue-50 text-blue-600' :
                project.status === 'COMPLETED' ? 'bg-green-50 text-green-600' :
                'bg-amber-50 text-amber-600'
              }`}>
                {project.status}
              </span>
            </div>

            <div className="flex items-center gap-6 text-sm text-slate-500">
              <div className="flex items-center gap-2">
                <Calendar size={16} />
                <span>{project.startDate} - {project.endDate}</span>
              </div>
              <div className="flex items-center gap-2">
                <Users size={16} />
                <span>{project.members.length} members</span>
              </div>
            </div>

            <div className="mt-6">
              <div className="flex justify-between text-sm mb-2">
                <span className="font-medium text-slate-600">Progress</span>
                <span className="font-bold text-slate-800">{project.progress}%</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full" style={{ width: `${project.progress}%` }}></div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="flex border-b border-slate-100">
              <button
                onClick={() => setActiveTab('tasks')}
                className={`px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-sm font-bold ${activeTab === 'tasks' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500'}`}
              >
                Tasks ({tasks.length})
              </button>
              <button
                onClick={() => setActiveTab('docs')}
                className={`px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-sm font-bold ${activeTab === 'docs' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500'}`}
              >
                Documents ({docs.length})
              </button>
              <button
                onClick={() => setActiveTab('team')}
                className={`px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-sm font-bold ${activeTab === 'team' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500'}`}
              >
                Team ({project.members.length})
              </button>
            </div>

            <div className="p-4 md:p-6">
              {activeTab === 'tasks' && (
                <div className="space-y-3">
                  {tasks.map(task => (
                    <div key={task.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${task.status === 'DONE' ? 'bg-green-500' : 'bg-blue-500'}`}></div>
                        <span className="font-medium text-slate-700">{task.title}</span>
                      </div>
                      <span className={`text-xs font-bold px-2 py-1 rounded ${task.priority === 'HIGH' ? 'bg-rose-50 text-rose-600' : 'bg-slate-100 text-slate-600'}`}>
                        {task.priority}
                      </span>
                    </div>
                  ))}
                  {tasks.length === 0 && <p className="text-slate-400 text-sm">No tasks yet</p>}
                </div>
              )}

              {activeTab === 'docs' && (
                <div className="space-y-3">
                  {docs.map(doc => (
                    <div key={doc.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                      <div className="flex items-center gap-3">
                        <FileText size={18} className="text-slate-400" />
                        <span className="font-medium text-slate-700">{doc.name}</span>
                      </div>
                      <span className={`text-xs font-bold px-2 py-1 rounded ${doc.sensitivity === 'HIGH' ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-600'}`}>
                        {doc.sensitivity}
                      </span>
                    </div>
                  ))}
                  {docs.length === 0 && <p className="text-slate-400 text-sm">No documents yet</p>}
                </div>
              )}

              {activeTab === 'team' && (
                <div className="space-y-3">
                  {project.members.map(memberId => (
                    <div key={memberId} className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl">
                      <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold text-xs">
                        {memberId.charAt(1).toUpperCase()}
                      </div>
                      <span className="font-medium text-slate-700">User {memberId}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="bg-white p-4 md:p-6 rounded-2xl border border-slate-100 shadow-sm">
            <h3 className="font-bold text-slate-800 mb-4">Project Details</h3>
            <div className="space-y-4 text-sm">
              <div>
                <p className="text-slate-400">Department</p>
                <p className="font-medium text-slate-700">{project.department}</p>
              </div>
              <div>
                <p className="text-slate-400">Start Date</p>
                <p className="font-medium text-slate-700">{project.startDate}</p>
              </div>
              <div>
                <p className="text-slate-400">End Date</p>
                <p className="font-medium text-slate-700">{project.endDate}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
