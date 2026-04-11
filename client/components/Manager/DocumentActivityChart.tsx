
import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const data = [
  { name: '08:00', views: 45, downloads: 12 },
  { name: '10:00', views: 82, downloads: 28 },
  { name: '12:00', views: 35, downloads: 10 },
  { name: '14:00', views: 95, downloads: 42 },
  { name: '16:00', views: 120, downloads: 35 },
  { name: '18:00', views: 60, downloads: 15 },
];

export const DocumentActivityChart: React.FC = () => (
  <div className="bg-white p-4 md:p-6 rounded-3xl border border-slate-100 shadow-sm">
    <h3 className="text-lg font-bold text-slate-800 mb-4">Hoạt động tài liệu theo giờ</h3>
    <div className="h-64 w-full">
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data}>
        <defs>
          <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.2}/>
            <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} />
        <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} />
        <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
        <Area type="monotone" dataKey="views" stroke="#0ea5e9" strokeWidth={3} fillOpacity={1} fill="url(#colorViews)" />
        <Area type="monotone" dataKey="downloads" stroke="#6366f1" strokeWidth={2} fillOpacity={0} />
      </AreaChart>
    </ResponsiveContainer>
    </div>
  </div>
);
