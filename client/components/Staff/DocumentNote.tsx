
import React, { useState } from 'react';
import { MessageSquare, Save, X, Trash2 } from 'lucide-react';

interface DocumentNoteProps {
  isOpen: boolean;
  onClose: () => void;
  docName: string;
  initialNote?: string;
  onSave: (note: string) => void;
}

export const DocumentNote: React.FC<DocumentNoteProps> = ({ isOpen, onClose, docName, initialNote = '', onSave }) => {
  const [note, setNote] = useState(initialNote);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose}></div>
      <div className="bg-white w-full max-w-md rounded-[32px] shadow-2xl relative z-10 overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="p-4 md:p-6 border-b border-slate-100 flex justify-between items-center bg-sky-50/30">
          <div className="flex items-center gap-3 text-sky-600">
            <MessageSquare size={20} />
            <h3 className="text-sm font-black uppercase tracking-tight">Ghi chú tài liệu</h3>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-white transition-all">
            <X size={20} />
          </button>
        </div>

        <div className="p-4 md:p-8 space-y-4">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 mb-2">
            <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Tài liệu</p>
            <p className="text-xs font-bold text-slate-700">{docName}</p>
          </div>

          <textarea 
            className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none transition-all h-40 resize-none font-medium text-slate-700"
            placeholder="Viết ghi chú cá nhân của bạn tại đây (chỉ bạn mới có thể xem)..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />

          <div className="flex gap-3">
            <button 
              onClick={() => { setNote(''); onSave(''); onClose(); }}
              className="flex-1 px-4 py-3 bg-slate-50 text-slate-500 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-50 hover:text-rose-500 transition-all flex items-center justify-center gap-2"
            >
              <Trash2 size={16} /> Xóa ghi chú
            </button>
            <button 
              onClick={() => { onSave(note); onClose(); }}
              className="flex-[2] px-4 py-3 bg-sky-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-sky-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-sky-500/20"
            >
              <Save size={16} /> Lưu ghi chú
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
