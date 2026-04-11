
import React, { useState } from 'react';
import { X, ShieldAlert, Clock, MessageSquare, Send } from 'lucide-react';
import { Document } from '../../types';

interface DocumentAccessRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: Document | null;
  onSubmit: (reason: string, duration: string) => void;
}

export const DocumentAccessRequestModal: React.FC<DocumentAccessRequestModalProps> = ({ 
  isOpen, onClose, document, onSubmit 
}) => {
  const [reason, setReason] = useState('');
  const [duration, setDuration] = useState('4');

  if (!isOpen || !document) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose}></div>
      <div className="bg-white w-full max-w-md rounded-[32px] shadow-2xl relative z-10 overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="p-4 md:p-6 border-b border-slate-100 flex justify-between items-center bg-amber-50/30">
          <div className="flex items-center gap-3 text-amber-600">
            <ShieldAlert size={24} />
            <h3 className="text-lg font-black uppercase italic tracking-tight">Yêu cầu truy cập JIT</h3>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-white">
            <X size={20} />
          </button>
        </div>

        <div className="p-4 md:p-8 space-y-6">
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Tài liệu yêu cầu</p>
            <p className="text-sm font-bold text-slate-800">{document.name}</p>
            <p className="text-[11px] text-amber-600 font-bold uppercase mt-1">Sensitivity: {document.sensitivity}</p>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <MessageSquare size={14} /> Lý do truy cập
            </label>
            <textarea 
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all h-24 resize-none"
              placeholder="Vui lòng mô tả mục đích sử dụng tài liệu này..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Clock size={14} /> Thời gian cấp quyền (Giờ)
            </label>
            <select 
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-sm focus:ring-2 focus:ring-amber-500/20 outline-none"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
            >
              <option value="1">1 Giờ</option>
              <option value="4">4 Giờ (Tiêu chuẩn)</option>
              <option value="8">8 Giờ</option>
              <option value="24">24 Giờ</option>
            </select>
          </div>

          <button 
            onClick={() => onSubmit(reason, duration)}
            disabled={!reason.trim()}
            className="w-full bg-slate-900 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-amber-600 transition-all disabled:opacity-50 disabled:bg-slate-300"
          >
            <Send size={18} /> Gửi yêu cầu cho Manager
          </button>
        </div>
      </div>
    </div>
  );
};
