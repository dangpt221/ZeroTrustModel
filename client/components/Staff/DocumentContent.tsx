import React, { useState, useEffect, useRef } from 'react';
import { X, FileText, File, AlertCircle } from 'lucide-react';
import { renderAsync } from 'docx-preview';
import { Document } from '../../types';

interface DocumentContentProps {
  document: Document | null;
  onClose: () => void;
}

// Helper to make URL absolute
const getAbsoluteUrl = (url: string): string => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  // Assume relative URL - prepend current host
  if (typeof window !== 'undefined') {
    return `${window.location.origin}${url.startsWith('/') ? '' : '/'}${url}`;
  }
  return url;
};

export const DocumentContent: React.FC<DocumentContentProps> = ({
  document: doc,
  onClose
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [textContent, setTextContent] = useState<string | null>(null);
  const [docxBlob, setDocxBlob] = useState<Blob | null>(null);
  const [loadingProgress, setLoadingProgress] = useState<string>('');
  const docxContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (doc) {
      setError(null);
      setPreviewUrl(null);
      setTextContent(null);
      setDocxBlob(null);
      setLoadingProgress('');
      loadPreview();
    }
  }, [doc]);

  const loadPreview = async () => {
    if (!doc) return;

    // Get document ID and form secure stream URL
    const docId = doc.id || (doc as any)._id;
    const url = getAbsoluteUrl(`/api/documents/${docId}/stream`);

    console.log('[DocumentContent] Loading document:', doc.name);
    console.log('[DocumentContent] Document ID:', docId);
    console.log('[DocumentContent] Stream URL:', url);

    if (!docId) {
      setError('Tài liệu bị lỗi định dạng ID.');
      return;
    }

    setLoading(true);
    setLoadingProgress('Đang tải tài liệu...');
    setDocxBlob(null);

    try {
      const fileType = (doc.fileType || doc.type || '').toUpperCase();
      const isImage = ['JPG', 'JPEG', 'PNG', 'GIF', 'WEBP', 'SVG', 'BMP'].includes(fileType);
      const isPdf = fileType === 'PDF';
      const isText = ['TXT', 'MD', 'JSON', 'XML', 'HTML', 'CSS', 'JS', 'TS', 'TSX', 'PY', 'JAVA', 'C', 'CPP', 'LOG'].includes(fileType);
      const isDocx = ['DOCX'].includes(fileType);

      console.log('[DocumentContent] File type:', fileType, 'isDocx:', isDocx);

      if (isImage || isPdf) {
        setPreviewUrl(url);
        setLoadingProgress('');
      } else if (isDocx) {
        // Load DOCX as blob for docx-preview
        setLoadingProgress('Đang tải file DOCX...');
        try {
          const response = await fetch(url, {
            method: 'GET',
            mode: 'cors',
            credentials: 'include'
          });

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }

          const blob = await response.blob();
          console.log('[DocumentContent] DOCX blob size:', blob.size, 'type:', blob.type);

          if (blob.size === 0) {
            throw new Error('File trống, không có dữ liệu');
          }

          setDocxBlob(blob);
          setLoadingProgress('');
        } catch (fetchErr: any) {
          console.error('[DocumentContent] Fetch error:', fetchErr);
          setError(`Không thể tải file DOCX: ${fetchErr.message}`);
        }
      } else if (isText) {
        setLoadingProgress('Đang đọc nội dung text...');
        try {
          const response = await fetch(url);
          const text = await response.text();
          setTextContent(text);
          setLoadingProgress('');
        } catch (fetchErr: any) {
          setError(`Không thể đọc file text: ${fetchErr.message}`);
        }
      } else {
        setError(`Không hỗ trợ xem file ${fileType}.`);
      }
    } catch (err: any) {
      console.error('[DocumentContent] Error:', err);
      setError(err.message || 'Không thể tải nội dung tài liệu.');
    } finally {
      setLoading(false);
    }
  };

  // Render DOCX when blob is loaded
  useEffect(() => {
    if (docxBlob && docxContainerRef.current) {
      console.log('[DocumentContent] Rendering DOCX blob, size:', docxBlob.size);

      // Clear container
      docxContainerRef.current.innerHTML = '';

      renderAsync(docxBlob, docxContainerRef.current, undefined, {
        className: 'docx-preview-content',
        inWrapper: true,
        ignoreWidth: false,
        ignoreHeight: false,
        ignoreFonts: false,
        breakPages: true,
        ignoreLastRenderedPageBreak: true,
        experimental: false,
        trimXmlDeclaration: true,
        useBase64URL: false,
        useMathMLPolyfill: false,
        renderChanges: false,
        renderHeaders: true,
        renderFooters: true,
        renderFootnotes: true,
        renderEndnotes: true,
      }).then(() => {
        console.log('[DocumentContent] DOCX rendered successfully');
      }).catch((err) => {
        console.error('[DocumentContent] DOCX render error:', err);
        setError('Lỗi hiển thị DOCX: ' + err.message);
      });
    }
  }, [docxBlob]);

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

  if (!doc) return null;

  const d = getDocDisplay(doc);
  const fileType = (doc.fileType || doc.type || '').toUpperCase();
  const isImage = ['JPG', 'JPEG', 'PNG', 'GIF', 'WEBP', 'SVG', 'BMP'].includes(fileType);
  const isPdf = fileType === 'PDF';
  const isText = ['TXT', 'MD', 'JSON', 'XML', 'HTML', 'CSS', 'JS', 'TS', 'TSX', 'PY', 'JAVA', 'C', 'CPP', 'LOG'].includes(fileType);
  const hasPreview = (previewUrl || textContent || docxBlob) && !error;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap border-b border-slate-200 bg-slate-50">
        <div className="flex items-center gap-4">
          <div className="p-2 bg-sky-100 rounded-xl">
            <FileText size={20} className="text-sky-600" />
          </div>
          <div>
            <h3 className="font-black text-slate-800 text-lg">{d.name}</h3>
            <p className="text-xs text-slate-500">{d.type} • {d.size}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-200 rounded-xl transition-colors"
          >
            <X size={20} className="text-slate-500" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 bg-slate-100" style={{ height: 'calc(100vh - 280px)', minHeight: '500px' }}>
        {loading ? (
          <div className="h-full flex flex-col items-center justify-center gap-4 text-slate-400">
            <div className="w-10 h-10 border-4 border-slate-200 border-t-sky-600 rounded-full animate-spin"></div>
            <p className="font-medium">{loadingProgress || 'Đang tải nội dung...'}</p>
          </div>
        ) : error ? (
          <div className="h-full flex flex-col items-center justify-center gap-4 text-slate-400 max-w-md text-center p-4 md:p-8">
            <div className="p-4 bg-red-100 rounded-full">
              <AlertCircle size={48} className="text-red-500" />
            </div>
            <p className="font-medium text-red-600">{error}</p>
            <p className="text-xs text-slate-400 mt-2">
              URL: {doc.url || (doc as any).fileUrl}
            </p>
          </div>
        ) : hasPreview ? (
          <div className="h-full w-full overflow-auto p-4">
            {isPdf && previewUrl && (
              <iframe
                src={`${previewUrl}#toolbar=1&navpanes=1&scrollbar=1`}
                className="w-full h-full bg-white rounded-lg shadow-lg"
                title={d.name}
              />
            )}
            {isImage && previewUrl && (
              <div className="h-full flex items-center justify-center">
                <img
                  src={previewUrl}
                  alt={d.name}
                  className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
                />
              </div>
            )}
            {isText && textContent && (
              <pre className="w-full h-full p-4 bg-white rounded-lg shadow-lg text-sm font-mono overflow-auto whitespace-pre-wrap text-slate-800">
                {textContent}
              </pre>
            )}
            {docxBlob && (
              <div
                ref={docxContainerRef}
                className="w-full h-full overflow-auto bg-white rounded-lg shadow-lg p-4 md:p-6 docx-preview-wrapper"
                style={{ minHeight: '400px' }}
              />
            )}
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center gap-4 text-slate-400">
            <div className="p-4 bg-slate-200 rounded-full">
              <File size={48} className="text-slate-400" />
            </div>
            <p className="font-medium text-slate-600">Không có nội dung để hiển thị</p>
          </div>
        )}
      </div>
    </div>
  );
};
