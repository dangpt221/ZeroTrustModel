
import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { ProfileForm } from '../../components/Staff/ProfileForm';
import { DeviceList } from '../../components/Staff/DeviceList';
import { ShieldCheck } from 'lucide-react';

export const StaffProfile: React.FC = () => {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">


      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-8">
        <div className="lg:col-span-2 space-y-8">
          <ProfileForm user={user} />
        </div>

        <div className="space-y-8">
          <DeviceList />
          
          <div className="bg-emerald-600 p-4 md:p-8 rounded-[40px] text-white shadow-xl">
            <h4 className="font-black text-xs uppercase tracking-[0.2em] mb-4">Trạng thái Trust</h4>
            <div className="flex items-end gap-3 mb-6">
              <span className="text-5xl font-black leading-none">{user.trustScore}%</span>
              <span className="text-[10px] font-bold uppercase tracking-widest pb-1 opacity-80">Verified</span>
            </div>
            <div className="w-full bg-white/20 h-2 rounded-full overflow-hidden">
              <div className="bg-white h-full" style={{ width: `${user.trustScore}%` }}></div>
            </div>
            <p className="text-[10px] mt-6 leading-relaxed font-medium opacity-90 italic">
              "Điểm tin cậy của bạn cao nhờ vào việc sử dụng thiết bị thường xuyên và luôn bật MFA."
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
