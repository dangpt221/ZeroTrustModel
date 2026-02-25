
import React from 'react';
import { AlertTriangle, Info, ShieldAlert } from 'lucide-react';

interface AlertCardProps {
  level: 'HIGH' | 'MEDIUM' | 'LOW';
  message: string;
  time: string;
}

export const AdminAlertCard: React.FC<AlertCardProps> = ({ level, message, time }) => {
  const config = {
    HIGH: { color: 'bg-red-50 text-red-700 border-red-100', icon: <ShieldAlert size={18}/>, label: 'Nghiêm trọng' },
    MEDIUM: { color: 'bg-amber-50 text-amber-700 border-amber-100', icon: <AlertTriangle size={18}/>, label: 'Cảnh báo' },
    LOW: { color: 'bg-blue-50 text-blue-700 border-blue-100', icon: <Info size={18}/>, label: 'Thông tin' },
  };

  const { color, icon, label } = config[level];

  return (
    <div className={`p-4 rounded-xl border ${color} flex gap-4 items-start`}>
      <div className="mt-0.5">{icon}</div>
      <div className="flex-1">
        <div className="flex justify-between items-center mb-1">
          <span className="text-xs font-bold uppercase tracking-widest">{label}</span>
          <span className="text-[10px] opacity-70 font-medium">{time}</span>
        </div>
        <p className="text-sm leading-snug">{message}</p>
      </div>
    </div>
  );
};
