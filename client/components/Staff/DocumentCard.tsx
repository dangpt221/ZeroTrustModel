
import React, { useState } from 'react';
import { FileText, Download, Eye, Lock, Bookmark, ShieldAlert, MessageSquare, ShieldOff } from 'lucide-react';
import { Document } from '../../types';
import { DocumentNote } from './DocumentNote';

interface DocumentCardProps {
  doc: Document;
  onView: (doc: Document) => void;
  onRequestAccess: (doc: Document) => void;
}

export const DocumentCard: React.FC<DocumentCardProps> = ({ doc, onView, onRequestAccess }) => {
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isNoteOpen, setIsNoteOpen] = useState(false);
  const [note, setNote] = useState('');

  const getSensitivityStyles = (level: string) => {
    switch (level) {
      case 'CRITICAL': return 'bg-rose-50 text-rose-600 border-rose-100';
      case 'HIGH': return 'bg-amber-50 text-amber-600 border-amber-100';
      case 'MEDIUM': return 'bg-blue-50 text-blue-600 border-blue-100';
      default: return 'bg-emerald-50 text-emerald-600 border-emerald-100';
    }
  };

  const isRestricted = doc.sensitivity === 'CRITICAL' || doc.sensitivity === 'HIGH';

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isRestricted) {
      alert("Nexus Zero Trust Policy: Download tài liệu Confidential/Critical yêu cầu Token bảo mật phần cứng.");
    } else {
      alert(`Đang bắt đầu tải xuống: ${doc.name}`);
    }
  };

  return (
    <div className="bg-white p-6 rounded-[32px] border border-slate-100 hover:border-emerald-200 transition-all group shadow-sm hover:shadow-xl relative overflow-hidden flex flex-col h-full">
      <div className="flex items-start justify-between mb-5">
        <div className={`p-4 rounded-2xl transition-colors ${isRestricted ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white'}`}>
          <FileText size={24} />
        </div>
        <div className="flex gap-1">
          <button 
            onClick={() => setIsBookmarked(!isBookmarked)}
            className={`p-2 rounded-xl transition-all ${isBookmarked ? 'text-amber-500 bg-amber-50' : 'text-slate-300 hover:text-amber-500 hover:bg-amber-50'}`}
            title="Đánh dấu tài liệu"
          >
            <Bookmark size={18} fill={isBookmarked ? 'currentColor' : 'none'} />
          </button>
          <button 
            onClick={() => setIsNoteOpen(true)}
            className={`p-2 rounded-xl transition-all ${note ? 'text-sky-500 bg-sky-50' : 'text-slate-300 hover:text-sky-500 hover:bg-sky-50'}`}
            title="Ghi chú cá nhân"
          >
            <MessageSquare size={18} fill={note ? 'currentColor' : 'none'} />
          </button>
          <button 
            onClick={handleDownload}
            className={`p-2 rounded-xl transition-all ${isRestricted ? 'text-slate-200 cursor-not-allowed' : 'text-slate-300 hover:text-emerald-600 hover:bg-emerald-50'}`}
            title={isRestricted ? "Download bị hạn chế" : "Tải xuống"}
          >
            {isRestricted ? <ShieldOff size={18} /> : <Download size={18} />}
          </button>
        </div>
      </div>

      <div className="space-y-1 mb-6 flex-1">
        <h4 className="font-black text-slate-800 text-base group-hover:text-emerald-700 transition-colors line-clamp-1 italic">{doc.name}</h4>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{doc.type} • {doc.size}</p>
        {note && (
          <div className="mt-3 p-2 bg-sky-50/50 rounded-lg border-l-2 border-sky-400 animate-in fade-in slide-in-from-left-2">
            <p className="text-[10px] text-sky-700 font-medium italic line-clamp-2">Note: {note}</p>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-slate-50">
        <span className={`text-[10px] font-black px-3 py-1 rounded-full border uppercase tracking-tighter ${getSensitivityStyles(doc.sensitivity)}`}>
          {doc.sensitivity}
        </span>
        
        <button 
          onClick={() => isRestricted ? onRequestAccess(doc) : onView(doc)}
          className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 px-4 py-2 rounded-xl transition-all ${
            isRestricted 
            ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20 hover:bg-amber-600' 
            : 'bg-slate-900 text-white hover:bg-emerald-600'
          }`}
        >
          {isRestricted ? <ShieldAlert size={12} /> : <Eye size={12} />}
          {isRestricted ? 'Gửi yêu cầu' : 'Mở tài liệu'}
        </button>
      </div>

      {doc.sensitivity === 'CRITICAL' && (
        <div className="absolute top-0 right-0 p-2">
          <div className="bg-rose-500 text-white p-1 rounded-bl-xl shadow-lg animate-pulse">
            <Lock size={12} />
          </div>
        </div>
      )}

      <DocumentNote 
        isOpen={isNoteOpen}
        onClose={() => setIsNoteOpen(false)}
        docName={doc.name}
        initialNote={note}
        onSave={(newNote) => setNote(newNote)}
      />
    </div>
  );
};
