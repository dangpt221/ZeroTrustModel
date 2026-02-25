
import React from 'react';
import { Search, Filter, Grid, List as ListIcon } from 'lucide-react';

interface DocumentFilterProps {
  onSearch: (term: string) => void;
  onFilterChange: (filter: string) => void;
}

export const DocumentFilter: React.FC<DocumentFilterProps> = ({ onSearch, onFilterChange }) => {
  return (
    <div className="flex flex-col md:flex-row gap-4 mb-8">
      <div className="flex-1 relative group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors" size={18} />
        <input 
          type="text" 
          placeholder="Tìm kiếm hướng dẫn, quy trình, tài liệu kỹ thuật..."
          onChange={(e) => onSearch(e.target.value)}
          className="w-full bg-white border border-slate-200 rounded-2xl py-3.5 pl-12 pr-4 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all shadow-sm font-medium text-sm"
        />
      </div>
      <div className="flex gap-2">
        <select 
          onChange={(e) => onFilterChange(e.target.value)}
          className="bg-white border border-slate-200 rounded-2xl px-5 py-2 text-sm font-bold text-slate-600 outline-none focus:ring-2 focus:ring-emerald-500/20"
        >
          <option value="ALL">Mọi mức độ bảo mật</option>
          <option value="LOW">Public / Low</option>
          <option value="MEDIUM">Internal / Medium</option>
          <option value="HIGH">Confidential / High</option>
          <option value="CRITICAL">Restricted / Critical</option>
        </select>
        <button className="bg-white border border-slate-200 text-slate-400 p-3 rounded-2xl hover:text-emerald-600 hover:bg-emerald-50 transition-all">
          <Grid size={20} />
        </button>
      </div>
    </div>
  );
};
