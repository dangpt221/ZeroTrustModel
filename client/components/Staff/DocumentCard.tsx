
import React, { useState } from 'react';
import { FileText, Eye, Bookmark, MessageSquare, ShieldOff, Shield } from 'lucide-react';
import { Document } from '../../types';

interface DocumentCardProps {
  doc: Document;
  onView: (doc: Document) => void;
  onRequestAccess: (doc: Document) => void;
}

export const DocumentCard: React.FC<DocumentCardProps> = ({
  doc,
  onView,
  onRequestAccess,
}) => {
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isNoteOpen, setIsNoteOpen] = useState(false);
  const [note, setNote] = useState('');

  const isRestricted = doc.sensitivity === 'CRITICAL' || doc.sensitivity === 'HIGH' || doc.classification === 'CONFIDENTIAL';
  const isHighSecurity = doc.sensitivity === 'CRITICAL' || doc.classification === 'CONFIDENTIAL';
  const hasDRM = doc.drm?.enabled;

  const getSensitivityStyles = (level: string) => {
    switch (level) {
      case 'CRITICAL': return 'bg-rose-50 text-rose-600 border-rose-100';
      case 'HIGH': return 'bg-amber-50 text-amber-600 border-amber-100';
      case 'MEDIUM': return 'bg-blue-50 text-blue-600 border-blue-100';
      default: return 'bg-emerald-50 text-emerald-600 border-emerald-100';
    }
  };

  return (
    <div className="bg-white p-4 md:p-6 rounded-[32px] border border-slate-100 hover:border-emerald-200 transition-all group shadow-sm hover:shadow-xl relative overflow-hidden flex flex-col h-full">
      {/* Security badge */}
      {isHighSecurity && (
        <div className="absolute top-0 right-0 p-2">
          <div className="bg-rose-500 text-white p-1.5 rounded-bl-xl shadow-lg animate-pulse">
            <Shield size={14} />
          </div>
        </div>
      )}

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

          {/* TUYỆT ĐỐI CẤM TẢI — ZeroTrust: không ai được tải file về máy */}
          <button
            onClick={() => alert('Tải file về máy bị cấm tuyệt đối. Sử dụng chế độ xem trực tuyến để xem tài liệu.')}
            className="p-2 rounded-xl transition-all text-rose-300 cursor-not-allowed"
            title="Tải file bị cấm — xem trực tuyến thay thế"
          >
            <ShieldOff size={18} />
          </button>
        </div>
      </div>

      <div className="space-y-1 mb-6 flex-1">
        <h4 className="font-black text-slate-800 text-base group-hover:text-emerald-700 transition-colors line-clamp-1 italic">{doc.title}</h4>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          {doc.fileType || 'Tài liệu'} • {doc.fileSize || '-'}
        </p>

        {/* DRM indicator */}
        {hasDRM && (
          <div className="flex items-center gap-1 mt-2 text-[10px] text-emerald-600">
            <Shield size={10} />
            <span>DRM Bảo vệ</span>
          </div>
        )}

        {note && (
          <div className="mt-3 p-2 bg-sky-50/50 rounded-lg border-l-2 border-sky-400 animate-in fade-in slide-in-from-left-2">
            <p className="text-[10px] text-sky-700 font-medium italic line-clamp-2">Note: {note}</p>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-slate-50">
        <span className={`text-[10px] font-black px-3 py-1 rounded-full border uppercase tracking-tighter ${getSensitivityStyles(doc.sensitivity || 'LOW')}`}>
          {doc.sensitivity || 'LOW'}
        </span>

        <button
          onClick={() => isRestricted ? onRequestAccess(doc) : onView(doc)}
          className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 px-4 py-2 rounded-xl transition-all ${
            isRestricted
            ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20 hover:bg-amber-600'
            : 'bg-slate-900 text-white hover:bg-emerald-600'
          }`}
        >
          {isRestricted ? <Shield size={12} /> : <Eye size={12} />}
          {isRestricted ? 'Gửi yêu cầu' : 'Mở tài liệu'}
        </button>
      </div>

      <DocumentNote
        isOpen={isNoteOpen}
        onClose={() => setIsNoteOpen(false)}
        docName={doc.title}
        initialNote={note}
        onSave={(newNote) => setNote(newNote)}
      />
    </div>
  );
};

interface DocumentNoteProps {
  isOpen: boolean;
  onClose: () => void;
  docName: string;
  initialNote: string;
  onSave: (note: string) => void;
}

const DocumentNote: React.FC<DocumentNoteProps> = ({ isOpen, onClose, docName, initialNote, onSave }) => {
  const [note, setNote] = useState(initialNote);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-4 md:p-6 animate-in fade-in zoom-in-95">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-slate-800">Ghi chú: {docName}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Nhập ghi chú cá nhân của bạn..."
          className="w-full h-32 p-3 border border-slate-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-sky-500"
        />
        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            Hủy
          </button>
          <button
            onClick={() => { onSave(note); onClose(); }}
            className="px-4 py-2 text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 rounded-lg transition-colors"
          >
            Lưu
          </button>
        </div>
      </div>
    </div>
  );
};
