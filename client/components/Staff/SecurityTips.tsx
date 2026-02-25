
import React, { useState, useEffect } from 'react';
import { ShieldCheck, Zap, Info, ArrowRight } from 'lucide-react';

const TIPS = [
  { id: 1, title: 'Bật 2FA ngay', content: 'Xác thực đa yếu tố giúp tăng 99% khả năng bảo vệ tài khoản khỏi xâm nhập trái phép.', icon: <Zap className="text-amber-500" /> },
  { id: 2, title: 'Cảnh giác IP lạ', content: 'Nếu bạn nhận thấy phiên đăng nhập từ một địa chỉ IP không quen thuộc, hãy báo cáo SOC ngay.', icon: <ShieldCheck className="text-emerald-500" /> },
  { id: 3, title: 'Hết hạn JIT', content: 'Quyền truy cập tạm thời (JIT) sẽ hết hạn sau 4 giờ. Hãy lưu lại tiến độ công việc của bạn.', icon: <Info className="text-sky-500" /> },
];

export const SecurityTips: React.FC = () => {
  const [currentTip, setCurrentTip] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTip(prev => (prev + 1) % TIPS.length);
    }, 8000);
    return () => clearInterval(timer);
  }, []);

  const tip = TIPS[currentTip];

  return (
    <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm relative overflow-hidden group transition-all hover:shadow-md">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-slate-50 rounded-xl">
          {tip.icon}
        </div>
        <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Security Tip</h4>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-black text-slate-800">{tip.title}</p>
        <p className="text-[11px] text-slate-500 font-medium leading-relaxed italic line-clamp-2">
          "{tip.content}"
        </p>
      </div>

      <div className="mt-6 flex justify-between items-center">
        <div className="flex gap-1.5">
          {TIPS.map((_, idx) => (
            <div 
              key={idx} 
              className={`h-1 rounded-full transition-all duration-500 ${idx === currentTip ? 'w-6 bg-sky-500' : 'w-2 bg-slate-100'}`}
            ></div>
          ))}
        </div>
        <button 
          onClick={() => setCurrentTip(prev => (prev + 1) % TIPS.length)}
          className="p-2 text-slate-300 hover:text-sky-600 transition-colors"
        >
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
};
