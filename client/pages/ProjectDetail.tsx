
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { MOCK_PROJECTS, MOCK_TASKS, MOCK_DOCS } from '../mockData';
import { TaskStatus, Document } from '../types';
import { summarizeProject } from '../services/geminiService';
import { 
  ArrowLeft, 
  Plus, 
  Calendar, 
  User, 
  Sparkles, 
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
  const project = MOCK_PROJECTS.find(p => p.id === id);
  const tasks = MOCK_TASKS.filter(t => t.projectId === id);
  const docs = MOCK_DOCS.filter(d => d.projectId === id);
  
  const [activeTab, setActiveTab] = useState<'tasks' | 'docs' | 'team'>('tasks');
  const [aiSummary, setAiSummary] = useState<string>('Analyzing project data...');
  const [loadingAi, setLoadingAi] = useState(false);

  useEffect(() => {
    if (project) {
      setLoadingAi(true);
      summarizeProject(project.title, project.description).then(res => {
        setAiSummary(res || 'Analysis complete.');
        setLoadingAi(false);
      });
    }
  }, [project]);

  if (!project) return <div>Project not found</div>;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Link to="/projects" className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors text-sm font-medium">
        <ArrowLeft size={16} /> Back to Projects
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Col: Main Details */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-3xl font-bold text-slate-800">{project.title}</h2>
                <p className="text-slate-500 mt-2 max-w-2xl">{project.description}</p>
              </div>
              <span className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border ${
                project.status === 'IN_PROGRESS' ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-slate-50 text-slate-500 border-slate-100'
              }`}>
                {project.status.replace('_', ' ')}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-6 py-6 border-y border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400">
                  <Calendar size={20} />
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wide">Deadline</p>
                  <p className="text-sm font-semibold text-slate-700">{project.endDate}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400">
                  <User size={20} />
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wide">Manager</p>
                  <p className="text-sm font-semibold text-slate-700">Project Lead</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400">
                  <Users size={20} />
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wide">Members</p>
                  <p className="text-sm font-semibold text-slate-700">{project.members.length} Active</p>
                </div>
              </div>
            </div>

            <div className="mt-8">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold text-slate-700 uppercase tracking-wide">Overall Completion</span>
                <span className="text-sm font-bold text-blue-600">{project.progress}%</span>
              </div>
              <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                <div 
                  className="bg-blue-600 h-full rounded-full transition-all duration-1000 ease-out" 
                  style={{ width: `${project.progress}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* AI Insights Card */}
          <div className="bg-gradient-to-br from-indigo-600 to-violet-700 p-8 rounded-2xl shadow-xl text-white relative overflow-hidden group">
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl transition-transform group-hover:scale-150 duration-700"></div>
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-1.5 bg-white/20 rounded-lg">
                  <Sparkles size={18} className="text-yellow-300 fill-yellow-300" />
                </div>
                <h4 className="font-bold tracking-tight">AI Project Insight</h4>
              </div>
              <p className={`text-indigo-50 leading-relaxed italic ${loadingAi ? 'animate-pulse' : ''}`}>
                "{aiSummary}"
              </p>
            </div>
          </div>

          {/* Tabbed Board */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100">
            <div className="flex border-b border-slate-100 px-6">
              {[
                { id: 'tasks', label: 'Tasks', icon: <CheckSquare size={16} /> },
                { id: 'docs', label: 'Documents', icon: <FileText size={16} /> },
                { id: 'team', label: 'Team Activity', icon: <MessageCircle size={16} /> }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-6 py-4 text-sm font-semibold transition-all border-b-2 ${
                    activeTab === tab.id 
                      ? 'border-blue-600 text-blue-600' 
                      : 'border-transparent text-slate-400 hover:text-slate-600'
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="p-6">
              {activeTab === 'tasks' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center mb-4">
                    <h5 className="font-bold text-slate-800">Task Board</h5>
                    <button className="flex items-center gap-1.5 text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors">
                      <Plus size={14} /> Add Task
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {tasks.map(task => (
                      <div key={task.id} className="p-4 rounded-xl border border-slate-100 hover:border-blue-200 hover:shadow-md transition-all group">
                        <div className="flex justify-between items-start mb-3">
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-tighter ${
                            task.priority === 'HIGH' ? 'bg-red-50 text-red-500' : 'bg-slate-50 text-slate-400'
                          }`}>
                            {task.priority}
                          </span>
                          <span className="text-[10px] font-bold text-slate-400">{task.dueDate}</span>
                        </div>
                        <h6 className="font-bold text-slate-800 mb-1 group-hover:text-blue-600 transition-colors">{task.title}</h6>
                        <p className="text-xs text-slate-500 line-clamp-2 mb-4">{task.description}</p>
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                             <img src={`https://picsum.photos/seed/${task.assigneeId}/200`} className="w-5 h-5 rounded-full" />
                             <span className="text-[10px] text-slate-400">Assigned</span>
                          </div>
                          <span className="text-[10px] font-bold text-blue-500">{task.status.replace('_', ' ')}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'docs' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center mb-4">
                    <h5 className="font-bold text-slate-800">Repository</h5>
                    <label className="cursor-pointer flex items-center gap-1.5 text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors">
                      <Upload size={14} /> Upload New
                      <input type="file" className="hidden" />
                    </label>
                  </div>
                  <div className="space-y-2">
                    {docs.map(doc => (
                      <div key={doc.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
                            <FileText size={20} />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-700">{doc.name}</p>
                            <p className="text-[10px] text-slate-400">{doc.size} • Uploaded {doc.uploadedAt}</p>
                          </div>
                        </div>
                        <button className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all">
                          <Download size={18} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Col: Side Info */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h4 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
              <Users size={18} className="text-blue-500" />
              Project Team
            </h4>
            <div className="space-y-5">
              {project.members.map(memberId => (
                <div key={memberId} className="flex items-center gap-3">
                  <img src={`https://picsum.photos/seed/${memberId}/200`} className="w-10 h-10 rounded-xl" />
                  <div>
                    <p className="text-sm font-bold text-slate-700">Team Member</p>
                    <p className="text-[10px] text-slate-400 font-medium">{memberId === 'u1' ? 'Admin' : 'Specialist'}</p>
                  </div>
                </div>
              ))}
            </div>
            <button className="w-full mt-6 py-2.5 text-slate-500 hover:text-blue-600 text-xs font-bold uppercase tracking-widest border border-slate-100 hover:border-blue-100 rounded-xl transition-all">
              Manage Team
            </button>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h4 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
              <Shield size={18} className="text-emerald-500" />
              Security Policy
            </h4>
            <div className="space-y-4">
              <div className="p-3 bg-slate-50 rounded-xl">
                <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Access Level</p>
                <p className="text-xs font-semibold text-slate-600">Restricted to Internal VPN</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Data Sensitivity</p>
                <p className="text-xs font-semibold text-amber-600 flex items-center gap-1.5">
                  <AlertCircle size={12} /> Confidential (L2)
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Sub-components used for cleaner code
const Shield = ({ size, className }: { size: number, className: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
);
