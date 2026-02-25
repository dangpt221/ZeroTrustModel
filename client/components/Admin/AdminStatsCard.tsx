
import React from 'react';

interface StatsCardProps {
  title: string;
  value: string | number;
  trend: string;
  isPositive: boolean;
  icon: React.ReactNode;
  color: string;
}

export const AdminStatsCard: React.FC<StatsCardProps> = ({ title, value, trend, isPositive, icon, color }) => (
  <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between group hover:border-blue-200 transition-all duration-300">
    <div className="space-y-2">
      <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">{title}</p>
      <h3 className="text-3xl font-bold text-slate-800">{value}</h3>
      <div className={`text-xs font-semibold flex items-center gap-1 ${isPositive ? 'text-emerald-500' : 'text-rose-500'}`}>
        <span>{isPositive ? '↑' : '↓'} {trend}</span>
        <span className="text-slate-400 font-normal">so với tuần trước</span>
      </div>
    </div>
    <div className={`p-4 rounded-xl ${color} text-white shadow-lg transition-transform group-hover:scale-110`}>
      {icon}
    </div>
  </div>
);
