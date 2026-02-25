
import React from 'react';
import { FileText, Download, Eye, Lock } from 'lucide-react';
import { Document } from '../../types';

interface DocumentListProps {
  documents: Document[];
}

export const DocumentList: React.FC<DocumentListProps> = ({ documents }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    {documents.map(doc => (
      <div key={doc.id} className="bg-white p-5 rounded-2xl border border-slate-100 hover:border-emerald-200 transition-all group shadow-sm hover:shadow-md">
        <div className="flex items-start justify-between mb-4">
          <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
            <FileText size={24} />
          </div>
          <div className="flex gap-1">
            <button className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all">
              <Eye size={18} />
            </button>
            <button className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all">
              <Download size={18} />
            </button>
          </div>
        </div>
        <h4 className="font-bold text-slate-800 text-sm truncate">{doc.name}</h4>
        <div className="flex items-center justify-between mt-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{doc.type} • {doc.size}</span>
          <span className="flex items-center gap-1 text-[10px] font-black text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded uppercase">
            <Lock size={10} /> Authorized
          </span>
        </div>
      </div>
    ))}
  </div>
);
