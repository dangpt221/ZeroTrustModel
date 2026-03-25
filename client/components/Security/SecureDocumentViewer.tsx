import React, { useState, useRef, useEffect, useCallback } from 'react';

interface SecureDocumentViewerProps {
  document: {
    id: string;
    title: string;
    content?: string;
    url: string;
    fileType: string;
    classification?: string;
  };
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  onClose?: () => void;
  watermarkId?: string;
  onCaptureAttempt?: () => void;
}

export const SecureDocumentViewer: React.FC<SecureDocumentViewerProps> = ({
  document,
  user,
  onClose,
  watermarkId,
  onCaptureAttempt,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isBlurred, setIsBlurred] = useState(false);
  const [showWatermark, setShowWatermark] = useState(true);
  const [lastActivity, setLastActivity] = useState(Date.now());

  // Watermark overlay
  const watermarkText = `${user.name} | ${new Date().toLocaleString('vi-VN')} | ${watermarkId || 'N/A'}`;

  // Auto-blur khi tab không active
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setIsBlurred(true);
        onCaptureAttempt?.();
      } else {
        setIsBlurred(false);
        setLastActivity(Date.now());
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Auto-blur khi user rời khỏi tab (blur event)
  useEffect(() => {
    const handleBlur = () => {
      setIsBlurred(true);
      onCaptureAttempt?.();
    };

    const handleFocus = () => {
      setIsBlurred(false);
      setLastActivity(Date.now());
    };

    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  // Blur khi mouse rời khỏi container (tùy chọn)
  const handleMouseLeave = useCallback(() => {
    // Không blur tự động khi leave, chỉ blur khi tab không active
  }, []);

  // Prevent right-click
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    onCaptureAttempt?.();
  }, []);

  // Prevent copy
  const handleCopy = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault();
    onCaptureAttempt?.();
  }, []);

  // Prevent select all
  const handleSelectStart = useCallback((e: Event) => {
    // Chỉ prevent select text, cho phép tương tác button
  }, []);

  // Generate watermark tiles
  const generateWatermarkTiles = () => {
    const tiles = [];
    const count = 8;

    for (let i = 0; i < count; i++) {
      const rotation = -30 + (i % 2) * -15;
      const x = 50 + (i % 4) * 150;
      const y = 100 + Math.floor(i / 4) * 250;

      tiles.push(
        <div
          key={i}
          style={{
            position: 'absolute',
            left: `${x}px`,
            top: `${y}px`,
            transform: `rotate(${rotation}deg)`,
            color: 'rgba(128, 128, 128, 0.08)',
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
      );
    }

    return tiles;
  };

  const isHighSecurity = document.classification === 'CONFIDENTIAL';

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onContextMenu={handleContextMenu}
      onCopy={handleCopy}
    >
      {/* Main container */}
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${isHighSecurity ? 'bg-rose-500 animate-pulse' : 'bg-green-500'}`} />
            <div>
              <h2 className="font-semibold text-slate-800">{document.title}</h2>
              <p className="text-xs text-slate-500">
                {document.fileType.toUpperCase()} • {isHighSecurity ? 'CONFIDENTIAL - Giới hạn quyền truy cập' : document.classification || 'INTERNAL'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Security indicator */}
            <div className={`px-3 py-1 rounded-full text-xs font-medium ${isHighSecurity ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600'}`}>
              {isHighSecurity ? '🔒 Bảo mật cao' : '📄 Nội bộ'}
            </div>

            {/* Close button */}
            {onClose && (
              <button
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-200 transition-colors text-slate-500"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Document area */}
        <div
          className="flex-1 overflow-auto p-6 relative"
          onMouseLeave={handleMouseLeave}
          onContextMenu={handleContextMenu}
        >
          {/* Blur overlay */}
          {isBlurred && (
            <div className="absolute inset-0 bg-slate-100 flex items-center justify-center z-30">
              <div className="text-center">
                <div className="text-4xl mb-3">👁️</div>
                <p className="text-slate-600 font-medium">Nội dung đang được bảo vệ</p>
                <p className="text-slate-400 text-sm mt-1">Quay lại tab này để tiếp tục xem</p>
              </div>
            </div>
          )}

          {/* Watermark overlay - luôn hiển thị */}
          <div
            className="absolute inset-0 pointer-events-none overflow-hidden z-10"
            style={{ userSelect: 'none' }}
          >
            {generateWatermarkTiles()}
          </div>

          {/* Document content */}
          <div
            className={`relative z-20 ${isBlurred ? 'filter blur-lg opacity-50' : ''}`}
            onContextMenu={handleContextMenu}
            onCopy={handleCopy}
          >
            {document.url ? (
              <iframe
                src={document.url}
                className="w-full h-[600px] rounded-lg border border-slate-200"
                title={document.title}
                sandbox="allow-scripts allow-same-origin"
                onContextMenu={handleContextMenu}
              />
            ) : document.content ? (
              <div
                className="prose max-w-none p-8 bg-white rounded-lg border border-slate-200 min-h-[400px]"
                onContextMenu={handleContextMenu}
                onCopy={handleCopy}
              >
                {document.content}
              </div>
            ) : (
              <div className="flex items-center justify-center h-[400px] bg-slate-50 rounded-lg border border-slate-200">
                <div className="text-center text-slate-400">
                  <div className="text-4xl mb-3">📄</div>
                  <p>Không có nội dung để hiển thị</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-4">
            <span>👤 {user.name}</span>
            <span>📧 {user.email}</span>
            <span>🕐 {new Date().toLocaleString('vi-VN')}</span>
          </div>
          <div className="flex items-center gap-2">
            {watermarkId && (
              <span className="px-2 py-0.5 bg-slate-200 rounded text-slate-600">
                Watermark: {watermarkId.substring(0, 8)}...
              </span>
            )}
            <span className="text-amber-600 font-medium">
              ⚠️ Sao chép nội dung bị giới hạn
            </span>
          </div>
        </div>

        {/* Print warning overlay */}
        <PrintProtection />
      </div>
    </div>
  );
};

/**
 * Print protection component
 * Hiển thị cảnh báo khi user thử in
 */
const PrintProtection: React.FC = () => {
  const [showPrintWarning, setShowPrintWarning] = useState(false);

  useEffect(() => {
    const handleBeforePrint = () => {
      setShowPrintWarning(true);
    };

    const handleAfterPrint = () => {
      setShowPrintWarning(false);
    };

    window.addEventListener('beforeprint', handleBeforePrint);
    window.addEventListener('afterprint', handleAfterPrint);

    return () => {
      window.removeEventListener('beforeprint', handleBeforePrint);
      window.removeEventListener('afterprint', handleAfterPrint);
    };
  }, []);

  if (!showPrintWarning) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100]">
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
  );
};

/**
 * Watermark overlay component cho inline display
 */
interface WatermarkOverlayProps {
  user: {
    name: string;
    email: string;
    id: string;
  };
  watermarkId?: string;
  opacity?: number;
}

export const WatermarkOverlay: React.FC<WatermarkOverlayProps> = ({
  user,
  watermarkId,
  opacity = 0.05,
}) => {
  const watermarkText = `${user.name} | ${new Date().toLocaleString('vi-VN')}`;
  const tiles = [];

  for (let i = 0; i < 12; i++) {
    const rotation = -30 + (i % 3) * 20;
    const x = 30 + (i % 4) * 200;
    const y = 50 + Math.floor(i / 4) * 200;

    tiles.push(
      <div
        key={i}
        style={{
          position: 'absolute',
          left: `${x}px`,
          top: `${y}px`,
          transform: `rotate(${rotation}deg)`,
          color: `rgba(128, 128, 128, ${opacity})`,
          fontSize: '12px',
          fontFamily: 'Arial, sans-serif',
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
          userSelect: 'none',
        }}
      >
        {watermarkText}
        {watermarkId && ` | ${watermarkId.substring(0, 8)}`}
      </div>
    );
  }

  return (
    <div className="absolute inset-0 overflow-hidden">
      {tiles}
    </div>
  );
};

export default SecureDocumentViewer;
