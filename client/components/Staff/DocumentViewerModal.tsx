import React, { useState, useEffect } from 'react';
import { X, Download, FileText, File, ZoomIn, ZoomOut } from 'lucide-react';
import { Document } from '../../types';

interface DocumentViewerModalProps {
  document: Document | null;
  isOpen: boolean;
  onClose: () => void;
  onDownload?: (doc: Document) => void;
}

export const DocumentViewerModal: React.FC<DocumentViewerModalProps> = ({
  document: doc,
  isOpen,
  onClose,
  onDownload
}) => {
  const [activeTab, setActiveTab] = useState<'preview' | 'info'>('preview');
  const [zoom, setZoom] = useState(100);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [textContent, setTextContent] = useState<string | null>(null);

  useEffect(() => {
    if (doc && isOpen) {
      setActiveTab('preview');
      setZoom(100);
      setError(null);
      setPreviewUrl(null);
      setTextContent(null);
      loadPreview();
    }
  }, [doc, isOpen]);

  const loadPreview = async () => {
    if (!doc) return;

    const url = doc.url || (doc as any).fileUrl;

    // Nếu không có URL hoặc URL là placeholder
    if (!url || url === '#' || url === '') {
      setError('Tài liệu chưa có file để xem trước. Vui lòng tải xuống để xem.');
      return;
    }

    setLoading(true);
    try {
      const fileType = (doc.fileType || doc.type || '').toUpperCase();
      const isImage = ['JPG', 'JPEG', 'PNG', 'GIF', 'WEBP', 'SVG'].includes(fileType);
      const isPdf = fileType === 'PDF';
      const isText = ['TXT', 'MD', 'JSON', 'XML', 'HTML', 'CSS', 'JS', 'TS', 'TSX', 'PY', 'JAVA', 'C', 'CPP'].includes(fileType);

      if (isImage || isPdf) {
        setPreviewUrl(url);
      } else if (isText) {
        // Load text content for text files
        try {
          const response = await fetch(url);
          const text = await response.text();
          setTextContent(text);
        } catch {
          // Fallback to URL if fetch fails
          setPreviewUrl(url);
        }
      } else {
        setError(`Không thể xem trước file ${fileType}. Vui lòng tải xuống để xem.`);
      }
    } catch (err) {
      setError('Không thể tải nội dung tài liệu.');
    } finally {
      setLoading(false);
    }
  };

  const getDocDisplay = (document: Document) => ({
    name: document.name || document.title || 'Không tên',
    type: document.fileType || document.type || '-',
    size: document.fileSize || document.size || '-',
    uploadedBy: document.uploadedBy || document.ownerName || 'N/A',
    uploadedAt: document.createdAt ? new Date(document.createdAt).toLocaleDateString('vi-VN') :
                document.updatedAt ? new Date(document.updatedAt).toLocaleDateString('vi-VN') : '-',
    sensitivity: document.sensitivity || 'LOW',
    classification: document.classification || 'INTERNAL',
    description: document.description || '',
    department: document.departmentName || '-',
  });

  if (!isOpen || !doc) return null;

  const d = getDocDisplay(doc);
  const fileType = (doc.fileType || doc.type || '').toUpperCase();
  const isImage = ['JPG', 'JPEG', 'PNG', 'GIF', 'WEBP', 'SVG'].includes(fileType);
  const isPdf = fileType === 'PDF';
  const isText = ['TXT', 'MD', 'JSON', 'XML', 'HTML', 'CSS', 'JS', 'TS', 'TSX', 'PY', 'JAVA', 'C', 'CPP'].includes(fileType);
  const hasPreview = (previewUrl || textContent) && !error;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 bg-slate-900/90 backdrop-blur-sm">
      <div className="bg-white w-full h-[98vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-4">
            <div className="p-2 bg-sky-100 rounded-xl">
              <FileText size={20} className="text-sky-600" />
            </div>
            <div>
              <h3 className="font-black text-slate-800 text-lg truncate max-w-md">{d.name}</h3>
              <p className="text-xs text-slate-500">{d.type} • {d.size}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex bg-slate-200 rounded-xl p-1">
              <button
                onClick={() => setActiveTab('preview')}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                  activeTab === 'preview' ? 'bg-white text-sky-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Xem trước
              </button>
              <button
                onClick={() => setActiveTab('info')}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                  activeTab === 'info' ? 'bg-white text-sky-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Thông tin
              </button>
            </div>
            {onDownload && (
              <button
                onClick={() => onDownload(doc)}
                className="flex items-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-bold text-sm transition-colors"
              >
                <Download size={16} /> Tải xuống
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-200 rounded-xl transition-colors"
            >
              <X size={20} className="text-slate-500" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden bg-slate-100">
          {activeTab === 'preview' ? (
            <div className="h-full flex flex-col">
              {/* Preview toolbar */}
              {(isPdf || isImage || isText) && hasPreview && (
                <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setZoom(Math.max(50, zoom - 25))}
                      className="p-2 hover:bg-slate-100 rounded-lg"
                      title="Thu nhỏ"
                    >
                      <ZoomOut size={18} className="text-slate-600" />
                    </button>
                    <span className="text-sm font-medium text-slate-600 w-16 text-center">{zoom}%</span>
                    <button
                      onClick={() => setZoom(Math.min(200, zoom + 25))}
                      className="p-2 hover:bg-slate-100 rounded-lg"
                      title="Phóng to"
                    >
                      <ZoomIn size={18} className="text-slate-600" />
                    </button>
                  </div>
                </div>
              )}

              {/* Preview content */}
              <div className="flex-1 overflow-auto p-2 flex items-center justify-center bg-slate-800">
                {loading ? (
                  <div className="flex flex-col items-center gap-4 text-slate-400">
                    <div className="w-10 h-10 border-4 border-slate-200 border-t-sky-600 rounded-full animate-spin"></div>
                    <p className="font-medium">Đang tải nội dung...</p>
                  </div>
                ) : error ? (
                  <div className="flex flex-col items-center gap-4 text-slate-400 max-w-md text-center">
                    <div className="p-4 bg-slate-700 rounded-full">
                      <FileText size={48} className="text-slate-400" />
                    </div>
                    <p className="font-medium text-slate-300">{error}</p>
                    {onDownload && (
                      <button
                        onClick={() => onDownload(doc)}
                        className="flex items-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-bold text-sm"
                      >
                        <Download size={16} /> Tải xuống để xem
                      </button>
                    )}
                  </div>
                ) : hasPreview ? (
                  <div
                    className="w-full h-full overflow-auto"
                  >
                    {isPdf && (
                      <iframe
                        src={`${previewUrl!}#toolbar=1&navpanes=1&scrollbar=1`}
                        className="w-full h-full bg-white rounded-lg shadow-2xl"
                        title={d.name}
                      />
                    )}
                    {isImage && (
                      <div className="flex items-center justify-center p-4">
                        <img
                          src={previewUrl!}
                          alt={d.name}
                          className="max-w-full max-h-full rounded-lg shadow-2xl object-contain"
                          style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'center' }}
                        />
                      </div>
                    )}
                    {isText && textContent && (
                      <pre className="w-full h-full p-4 bg-white rounded-lg shadow-2xl text-sm font-mono overflow-auto whitespace-pre-wrap text-slate-800" style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top left' }}>
                        {textContent}
                      </pre>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-4 text-slate-400">
                    <div className="p-4 bg-slate-700 rounded-full">
                      <File size={48} className="text-slate-400" />
                    </div>
                    <p className="font-medium text-slate-300">Không có nội dung để hiển thị</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="h-full overflow-y-auto p-6">
              <div className="max-w-2xl mx-auto space-y-6">
                <div className="bg-white rounded-2xl p-6 border border-slate-200">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-4">Thông tin cơ bản</h4>
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs text-slate-400 uppercase font-bold">Tên tài liệu</p>
                      <p className="text-sm font-bold text-slate-800">{d.name}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-slate-400 uppercase font-bold">Loại file</p>
                        <p className="text-sm text-slate-700">{d.type}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400 uppercase font-bold">Kích thước</p>
                        <p className="text-sm text-slate-700">{d.size}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-6 border border-slate-200">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-4">Phân loại & Bảo mật</h4>
                  <div className="space-y-4">
                    <div className="flex gap-4">
                      <div className="flex-1">
                        <p className="text-xs text-slate-400 uppercase font-bold">Độ nhạy cảm</p>
                        <span className={`inline-block mt-1 text-[10px] font-bold px-3 py-1.5 rounded-lg ${
                          d.sensitivity === 'CRITICAL' ? 'bg-rose-50 text-rose-600' :
                          d.sensitivity === 'HIGH' ? 'bg-amber-50 text-amber-600' :
                          d.sensitivity === 'MEDIUM' ? 'bg-sky-50 text-sky-600' :
                          'bg-emerald-50 text-emerald-600'
                        }`}>
                          {d.sensitivity}
                        </span>
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-slate-400 uppercase font-bold">Mức độ bảo mật</p>
                        <span className={`inline-block mt-1 text-[10px] font-bold px-3 py-1.5 rounded-lg ${
                          d.classification === 'CONFIDENTIAL' ? 'bg-rose-50 text-rose-600' :
                          d.classification === 'INTERNAL' ? 'bg-amber-50 text-amber-600' :
                          'bg-emerald-50 text-emerald-600'
                        }`}>
                          {d.classification}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-6 border border-slate-200">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-4">Thông tin bổ sung</h4>
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs text-slate-400 uppercase font-bold">Người tải lên</p>
                      <p className="text-sm text-slate-700">{d.uploadedBy}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 uppercase font-bold">Ngày tải lên</p>
                      <p className="text-sm text-slate-700">{d.uploadedAt}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 uppercase font-bold">Bộ phận</p>
                      <p className="text-sm text-slate-700">{d.department}</p>
                    </div>
                    {d.description && (
                      <div>
                        <p className="text-xs text-slate-400 uppercase font-bold">Mô tả</p>
                        <p className="text-sm text-slate-700">{d.description}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
