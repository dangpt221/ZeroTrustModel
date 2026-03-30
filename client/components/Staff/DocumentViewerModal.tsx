import React, { useState, useEffect, useCallback } from 'react';
import { X, Download, FileText, File, ZoomIn, ZoomOut, Shield, AlertTriangle, Key } from 'lucide-react';
import { Document } from '../../types';
import { SecureDocumentViewer } from '../Security/SecureDocumentViewer';
import { renderAsync } from 'docx-preview';

interface DocumentViewerModalProps {
  document: Document | null;
  isOpen: boolean;
  onClose: () => void;
  onDownload?: (doc: Document) => void;
  onRequestAccess?: (doc: Document, reason: string) => Promise<void>;
  user?: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

export const DocumentViewerModal: React.FC<DocumentViewerModalProps> = ({
  document: doc,
  isOpen,
  onClose,
  onDownload,
  onRequestAccess,
  user,
}) => {
  const [activeTab, setActiveTab] = useState<'preview' | 'info'>('preview');
  const [zoom, setZoom] = useState(100);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [textContent, setTextContent] = useState<string | null>(null);
  const [docxBlob, setDocxBlob] = useState<Blob | null>(null);
  const docxContainerRef = React.useRef<HTMLDivElement>(null);
  const [isSecureMode, setIsSecureMode] = useState(false);
  const [showSecurityWarning, setShowSecurityWarning] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestReason, setRequestReason] = useState('');
  const [requestingAccess, setRequestingAccess] = useState(false);

  // Security states
  const [isBlurred, setIsBlurred] = useState(false);
  const [captureAttempts, setCaptureAttempts] = useState(0);
  const [showPrintWarning, setShowPrintWarning] = useState(false);

  useEffect(() => {
    if (doc && isOpen) {
      setActiveTab('preview');
      setZoom(100);
      setError(null);
      setPreviewUrl(null);
      setTextContent(null);
      setDocxBlob(null);
      setIsSecureMode(false);
      loadPreview();
    }
  }, [doc, isOpen]);

  // Auto-blur when tab is not active
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setIsBlurred(true);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Blur on window blur
  useEffect(() => {
    const handleBlur = () => setIsBlurred(true);
    const handleFocus = () => setIsBlurred(false);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  // Print protection
  useEffect(() => {
    const handleBeforePrint = () => setShowPrintWarning(true);
    const handleAfterPrint = () => setShowPrintWarning(false);
    window.addEventListener('beforeprint', handleBeforePrint);
    window.addEventListener('afterprint', handleAfterPrint);
    return () => {
      window.removeEventListener('beforeprint', handleBeforePrint);
      window.removeEventListener('afterprint', handleAfterPrint);
    };
  }, []);

  // Render DOCX when blob is loaded
  useEffect(() => {
    if (docxBlob && docxContainerRef.current) {
      console.log('[DocumentViewerModal] Rendering DOCX blob, size:', docxBlob.size);
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
        console.log('[DocumentViewerModal] DOCX rendered successfully');
      }).catch((err: any) => {
        console.error('[DocumentViewerModal] DOCX render error:', err);
        setError('Lỗi hiển thị DOCX: ' + err.message);
      });
    }
  }, [docxBlob]);

  const loadPreview = async () => {
    if (!doc) return;

    const url = doc.url || (doc as any).fileUrl;

    if (!url || url === '#' || url === '') {
      setError('Tài liệu chưa có file để xem trước. Vui lòng tải xuống để xem.');
      return;
    }

    setLoading(true);
    try {
      // GỌI SECURE STREAMING — không dùng trực tiếp doc.url
      // Backend sẽ check quyền: approved request, DRM, watermark
      const response = await fetch(`/api/documents/${doc.id}/stream`, {
        credentials: 'include',
      });

      if (response.status === 403) {
        const data = await response.json().catch(() => ({}));
        if (data.mode === 'STREAMING_ONLY') {
          setError(data.message || 'Bạn chưa được duyệt quyền xem tài liệu này.');
        } else if (data.requiresRequest) {
          setError(data.message || 'Bạn chưa được Admin duyệt quyền xem tài liệu này.');
        } else {
          setError(data.message || 'Bạn không có quyền xem tài liệu này.');
        }
        setShowRequestModal(true);
        setLoading(false);
        return;
      }

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setError(data.message || 'Không thể tải tài liệu.');
        setLoading(false);
        return;
      }

      // Nhận blob từ streaming endpoint
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);

      const fileType = (doc.fileType || doc.type || '').toUpperCase();
      const isImage = ['JPG', 'JPEG', 'PNG', 'GIF', 'WEBP', 'SVG'].includes(fileType);
      const isPdf = fileType === 'PDF';
      const isDocx = ['DOCX'].includes(fileType);
      const isText = ['TXT', 'MD', 'JSON', 'XML', 'HTML', 'CSS', 'JS', 'TS', 'TSX', 'PY', 'JAVA', 'C', 'CPP'].includes(fileType);

      if (isImage || isPdf) {
        setPreviewUrl(blobUrl);
      } else if (isDocx) {
        setDocxBlob(blob);
      } else if (isText) {
        const text = await blob.text();
        setTextContent(text);
        window.URL.revokeObjectURL(blobUrl);
      } else {
        window.URL.revokeObjectURL(blobUrl);
        setError(`Không thể xem trước file ${fileType}.`);
      }
    } catch (err) {
      setError('Không thể tải nội dung tài liệu.');
    } finally {
      setLoading(false);
    }
  };

  const getDocDisplay = (document: Document) => ({
    name: document.title || 'Không tên',
    type: document.fileType || document.type || '-',
    size: document.fileSize || '-',
    uploadedBy: document.uploadedBy || document.ownerName || 'N/A',
    uploadedAt: document.createdAt ? new Date(document.createdAt).toLocaleDateString('vi-VN') :
                document.updatedAt ? new Date(document.updatedAt).toLocaleDateString('vi-VN') : '-',
    sensitivity: document.sensitivity || 'LOW',
    classification: document.classification || 'INTERNAL',
    securityLevel: (document as any).securityLevel || 1,
    description: document.description || '',
    department: document.departmentName || '-',
    drm: (document as any).drm || null,
  });

  const handleCaptureAttempt = useCallback(() => {
    setCaptureAttempts(prev => prev + 1);
    setShowSecurityWarning(true);
    setTimeout(() => setShowSecurityWarning(false), 3000);
  }, []);

  const handleSendRequest = async () => {
    if (!doc || !onRequestAccess) return;
    try {
      setRequestingAccess(true);
      await onRequestAccess(doc, requestReason);
      setShowRequestModal(false);
      setRequestReason('');
    } catch {
      // error handled by parent
    } finally {
      setRequestingAccess(false);
    }
  };

  const handleSecureDownload = async () => {
    if (!doc) return;

    try {
      // Gọi API watermarked download
      const response = await fetch(`/api/documents/${doc.id}/download/watermarked`, {
        credentials: 'include',
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${doc.title || 'document'}.${doc.fileType || 'pdf'}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        const data = await response.json();
        alert(data.message || 'Không thể tải tài liệu');
      }
    } catch (err) {
      console.error('Download error:', err);
      alert('Lỗi khi tải tài liệu');
    }
  };

  if (!isOpen || !doc) return null;

  const d = getDocDisplay(doc);
  const fileType = (doc.fileType || doc.type || '').toUpperCase();
  const isImage = ['JPG', 'JPEG', 'PNG', 'GIF', 'WEBP', 'SVG'].includes(fileType);
  const isPdf = fileType === 'PDF';
  const isText = ['TXT', 'MD', 'JSON', 'XML', 'HTML', 'CSS', 'JS', 'TS', 'TSX', 'PY', 'JAVA', 'C', 'CPP'].includes(fileType);
  const isDocx = ['DOCX'].includes(fileType);
  const hasPreview = (previewUrl || textContent || docxBlob) && !error;

  const isHighSecurity = d.sensitivity === 'CRITICAL' || d.classification === 'CONFIDENTIAL';
  const hasDRM = d.drm?.enabled;

  // Nếu là chế độ bảo mật cao, dùng SecureDocumentViewer
  if (isSecureMode && user && hasPreview) {
    return (
      <SecureDocumentViewer
        document={{
          id: doc.id,
          title: d.name,
          content: textContent || undefined,
          url: previewUrl || '',
          fileType: d.type,
          classification: d.classification,
        }}
        user={user}
        onClose={onClose}
        watermarkId={doc.id}
        onCaptureAttempt={handleCaptureAttempt}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 bg-slate-900/90 backdrop-blur-sm">
      {/* Security warning overlay */}
      {showSecurityWarning && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[200] bg-amber-500 text-white px-6 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-pulse">
          <AlertTriangle size={20} />
          <span className="font-bold">Cảnh báo: Phát hiện hành vi bất thường! Đã ghi log.</span>
        </div>
      )}

      <div className="bg-white w-full h-[98vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-4">
            <div className={`p-2 rounded-xl ${isHighSecurity ? 'bg-rose-100' : 'bg-sky-100'}`}>
              <FileText size={20} className={isHighSecurity ? 'text-rose-600' : 'text-sky-600'} />
            </div>
            <div>
              <h3 className="font-black text-slate-800 text-lg truncate max-w-md">{d.name}</h3>
              <div className="flex items-center gap-2">
                <p className="text-xs text-slate-500">{d.type} • {d.size}</p>
                {isHighSecurity && (
                  <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 bg-rose-100 text-rose-600 rounded-full">
                    <Shield size={10} /> BẢO MẬT CAO
                  </span>
                )}
              </div>
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

            {/* Secure view toggle for high security docs */}
            {isHighSecurity && hasPreview && user && (
              <button
                onClick={() => setIsSecureMode(true)}
                className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-sm transition-colors"
                title="Chế độ bảo mật cao"
              >
                <Shield size={16} /> Chế độ bảo mật
              </button>
            )}

            {onDownload && (
              <button
                onClick={handleSecureDownload}
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
            <div className="h-full flex flex-col relative">
              {/* Watermark overlay for high security */}
              {isHighSecurity && hasPreview && (
                <WatermarkOverlay user={user} docId={doc.id} />
              )}

              {/* Blur overlay when tab not active */}
              {isBlurred && hasPreview && (
                <div className="absolute inset-0 bg-slate-100/80 flex items-center justify-center z-30 backdrop-blur-sm">
                  <div className="text-center bg-white/90 p-8 rounded-2xl shadow-xl">
                    <div className="text-5xl mb-4">👁️</div>
                    <p className="text-lg font-bold text-slate-700">Nội dung đang được bảo vệ</p>
                    <p className="text-slate-500 mt-2">Quay lại tab này để tiếp tục xem</p>
                  </div>
                </div>
              )}

              {/* Preview toolbar */}
              {(isPdf || isImage || isText || isDocx) && hasPreview && (
                <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-slate-200 relative z-20">
                  <div className="flex items-center gap-4">
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

                  {isHighSecurity && (
                    <div className="flex items-center gap-2 text-xs text-rose-600">
                      <Shield size={14} />
                      <span>Watermark bảo mật đang hoạt động</span>
                    </div>
                  )}
                </div>
              )}

              {/* Preview content */}
              <div
                className="flex-1 overflow-auto p-2 flex items-center justify-center bg-slate-800"
                onContextMenu={(e) => isHighSecurity ? e.preventDefault() : undefined}
                onCopy={(e) => isHighSecurity ? e.preventDefault() : undefined}
              >
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
                        onClick={handleSecureDownload}
                        className="flex items-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-bold text-sm"
                      >
                        <Download size={16} /> Tải xuống để xem
                      </button>
                    )}
                    {onRequestAccess && (
                      <button
                        onClick={() => setShowRequestModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-bold text-sm"
                      >
                        <Key size={16} /> Gửi yêu cầu xem
                      </button>
                    )}
                  </div>
                ) : hasPreview ? (
                  <div className="w-full h-full overflow-auto">
                    {isPdf && (
                      <iframe
                        src={`${previewUrl!}#toolbar=1&navpanes=1&scrollbar=1`}
                        className="w-full h-full bg-white rounded-lg shadow-2xl"
                        title={d.name}
                        onContextMenu={(e) => isHighSecurity ? e.preventDefault() : undefined}
                      />
                    )}
                    {isImage && (
                      <div className="flex items-center justify-center p-4">
                        <img
                          src={previewUrl!}
                          alt={d.name}
                          className="max-w-full max-h-full rounded-lg shadow-2xl object-contain"
                          style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'center' }}
                          onContextMenu={(e) => isHighSecurity ? e.preventDefault() : undefined}
                        />
                      </div>
                    )}
                    {isText && textContent && (
                      <pre
                        className="w-full h-full p-4 bg-white rounded-lg shadow-2xl text-sm font-mono overflow-auto whitespace-pre-wrap text-slate-800"
                        style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top left' }}
                        onContextMenu={(e) => isHighSecurity ? e.preventDefault() : undefined}
                        onCopy={(e) => isHighSecurity ? e.preventDefault() : undefined}
                      >
                        {textContent}
                      </pre>
                    )}
                    {docxBlob && (
                      <div
                        ref={docxContainerRef}
                        className="w-full h-full overflow-auto bg-white rounded-lg shadow-2xl p-6 docx-preview-wrapper"
                        style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top left', minHeight: '400px' }}
                        onContextMenu={(e) => isHighSecurity ? e.preventDefault() : undefined}
                      />
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
                          {d.classification} (Level {d.securityLevel})
                        </span>
                      </div>
                    </div>

                    {/* DRM Info */}
                    {hasDRM && (
                      <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                        <div className="flex items-center gap-2 mb-2">
                          <Shield size={16} className="text-sky-600" />
                          <span className="text-sm font-bold text-slate-700">DRM Bảo vệ</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          {d.drm.policy?.download === false && (
                            <span className="text-amber-600">⚠️ Không được tải</span>
                          )}
                          {d.drm.policy?.print === false && (
                            <span className="text-amber-600">⚠️ Không được in</span>
                          )}
                          {d.drm.policy?.copy === false && (
                            <span className="text-amber-600">⚠️ Không được copy</span>
                          )}
                          {d.drm.policy?.watermark && (
                            <span className="text-emerald-600">✅ Có watermark</span>
                          )}
                          {d.drm.policy?.expiresAt && (
                            <span className="text-slate-600">⏰ Hết hạn: {new Date(d.drm.policy.expiresAt).toLocaleDateString('vi-VN')}</span>
                          )}
                        </div>
                      </div>
                    )}
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

      {/* Print warning */}
      {showPrintWarning && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[200]">
          <div className="bg-white rounded-2xl p-8 max-w-md text-center shadow-2xl">
            <div className="text-5xl mb-4">🖨️</div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">Cảnh Báo In Ấn</h3>
            <p className="text-slate-600 mb-4">
              Tài liệu này được bảo mật. Mọi bản in đều có <strong>watermark</strong> chứa thông tin của bạn.
            </p>
            <p className="text-xs text-slate-400 mb-4">
              Hành động in đã được ghi lại trong hệ thống audit.
            </p>
            <button
              onClick={() => setShowPrintWarning(false)}
              className="px-6 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors"
            >
              Đóng
            </button>
          </div>
        </div>
      )}

      {/* Request Access Modal */}
      <RequestAccessModal
        isOpen={showRequestModal}
        doc={doc}
        onClose={() => setShowRequestModal(false)}
        onSend={handleSendRequest}
        isSending={requestingAccess}
      />
    </div>
  );
};

/**
 * Watermark overlay component
 */
const WatermarkOverlay: React.FC<{
  user?: { name: string; email: string };
  docId: string;
}> = ({ user, docId }) => {
  const watermarkText = user
    ? `${user.name} | ${new Date().toLocaleString('vi-VN')} | ${docId.substring(0, 8)}`
    : `WATERMARKED | ${new Date().toLocaleString('vi-VN')}`;

  const positions: Array<{ x: number; y: number; rotate: number }> = [
    { x: 50, y: 100, rotate: -30 },
    { x: 250, y: 200, rotate: -45 },
    { x: 400, y: 350, rotate: -30 },
    { x: 150, y: 500, rotate: -60 },
    { x: 350, y: 150, rotate: -45 },
    { x: 500, y: 450, rotate: -30 },
  ];

  const tiles = positions.map((pos, i) => (
      <div
        key={i}
        style={{
          position: 'absolute',
          left: `${pos.x}px`,
          top: `${pos.y}px`,
          transform: `rotate(${pos.rotate}deg)`,
          color: 'rgba(128, 128, 128, 0.05)',
          fontSize: '14px',
          fontFamily: 'Arial, sans-serif',
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
          userSelect: 'none',
          fontWeight: 500,
        }}
      >
        {watermarkText}
      </div>
  ));

  return (
    <div className="absolute inset-0 overflow-hidden z-10 pointer-events-none">
      {tiles}
    </div>
  );
};

/* Request Access Modal */
const RequestAccessModal: React.FC<{
  isOpen: boolean;
  doc: Document | null;
  onClose: () => void;
  onSend: (doc: Document, reason: string) => Promise<void>;
  isSending: boolean;
}> = ({ isOpen, doc, onClose, onSend, isSending }) => {
  const [reason, setReason] = useState('');
  if (!isOpen || !doc) return null;
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[200]">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 text-blue-600 rounded-xl">
              <Key size={20} />
            </div>
            <h3 className="font-black text-slate-800">Yêu cầu xem tài liệu</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-xl">
            <X size={20} className="text-slate-500" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
            <p className="text-sm font-bold text-slate-800">{doc.title || 'Tài liệu'}</p>
            <p className="text-xs text-blue-600 mt-1">Tài liệu bảo mật cao. Admin cần duyệt trước khi bạn có thể xem.</p>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase">Lý do xem tài liệu</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Nhập lý do bạn cần xem tài liệu này..."
              className="w-full mt-1 px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
              rows={3}
              autoFocus
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 py-3 border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50 transition-all"
            >
              Hủy
            </button>
            <button
              onClick={() => onSend(doc, reason)}
              disabled={isSending || !reason.trim()}
              className="flex-1 py-3 bg-blue-500 text-white rounded-xl font-bold hover:bg-blue-600 disabled:bg-slate-300 transition-all flex items-center justify-center gap-2"
            >
              {isSending ? 'Đang gửi...' : <><Key size={16} /> Gửi yêu cầu</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
