
import React from 'react';

interface StaffStatsCardProps {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ReactNode;
  color: string;
}

export const StaffStatsCard: React.FC<StaffStatsCardProps> = ({ title, value, subtitle, icon, color }) => (
  <div className="bg-white p-5 rounded-2xl border border-sky-100 shadow-sm flex items-center gap-4 hover:shadow-md transition-all">
    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-lg ${color}`}>
      {icon}
    </div>
    <div>
      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{title}</p>
      <h3 className="text-2xl font-black text-slate-800">{value}</h3>
      <p className="text-[10px] text-sky-600 font-semibold">{subtitle}</p>
    </div>
  </div>
);
