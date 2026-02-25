
import React, { useState } from 'react';
import { Smartphone, ShieldCheck, X } from 'lucide-react';

interface TwoFactorFormProps {
  isOpen: boolean;
  onClose: () => void;
  onVerify: (code: string) => void;
  docName: string;
}

export const TwoFactorForm: React.FC<TwoFactorFormProps> = ({ isOpen, onClose, onVerify, docName }) => {
  const [code, setCode] = useState('');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}></div>
      <div className="bg-white w-full max-w-sm rounded-[40px] shadow-2xl relative z-10 p-8 animate-in zoom-in-95 duration-300">
        <button onClick={onClose} className="absolute top-6 right-6 text-slate-400 hover:text-slate-600">
          <X size={24} />
        </button>

        <div className="text-center space-y-6">
          <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
            <Smartphone size={40} className="animate-bounce" />
          </div>
          
          <div className="space-y-2">
            <h3 className="text-xl font-black text-slate-800">Xác thực JIT</h3>
            <p className="text-xs text-slate-500 px-4">
              Bạn đang truy cập tài liệu: <span className="font-bold text-slate-700 italic">{docName}</span>. Nhập mã 6 số từ ứng dụng của bạn.
            </p>
          </div>

          <input 
            type="text" 
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            placeholder="000000"
            className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-4 text-center text-3xl tracking-[0.4em] font-mono font-black text-slate-800 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all"
            autoFocus
          />

          <button 
            onClick={() => onVerify(code)}
            disabled={code.length !== 6}
            className="w-full bg-slate-900 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-emerald-600 transition-all disabled:opacity-50 disabled:bg-slate-300"
          >
            <ShieldCheck size={20} /> Xác minh & Mở tài liệu
          </button>
        </div>
      </div>
    </div>
  );
};
