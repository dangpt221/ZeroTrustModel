
import React from 'react';
import { ShieldCheck, AlertCircle, Info } from 'lucide-react';

interface NotificationCardProps {
  type: 'SUCCESS' | 'WARNING' | 'INFO';
  message: string;
  time: string;
}

export const NotificationCard: React.FC<NotificationCardProps> = ({ type, message, time }) => {
  const styles = {
    SUCCESS: { bg: 'bg-emerald-50', border: 'border-emerald-100', text: 'text-emerald-700', icon: <ShieldCheck size={18} /> },
    WARNING: { bg: 'bg-amber-50', border: 'border-amber-100', text: 'text-amber-700', icon: <AlertCircle size={18} /> },
    INFO: { bg: 'bg-blue-50', border: 'border-blue-100', text: 'text-blue-700', icon: <Info size={18} /> },
  };

  const current = styles[type];

  return (
    <div className={`${current.bg} ${current.border} border p-4 rounded-2xl flex gap-3 items-start animate-in fade-in slide-in-from-right-4`}>
      <div className={current.text}>{current.icon}</div>
      <div className="flex-1">
        <p className={`text-sm font-semibold ${current.text}`}>{message}</p>
        <p className="text-[10px] text-slate-400 font-medium mt-1">{time}</p>
      </div>
    </div>
  );
};
