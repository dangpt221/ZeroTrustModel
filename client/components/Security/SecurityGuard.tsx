
import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { auditLogsApi } from '../../api';

interface SecurityGuardProps {
  children: React.ReactNode;
}

export const SecurityGuard: React.FC<SecurityGuardProps> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [isBlurred, setIsBlurred] = useState(false);

  // Watermark pattern as SVG data URI
  const createWatermark = useCallback(() => {
    if (!user) return '';
    const name = user.name || 'Nexus User';
    const email = user.email || '';
    const date = new Date().toLocaleDateString();
    
    // Create an SVG with rotated text
    const svg = `
      <svg width="400" height="400" xmlns="http://www.w3.org/2000/svg">
        <text x="50%" y="50%" fill="rgba(0,0,0,0.03)" font-family="Arial" font-size="12" font-weight="bold" 
          text-anchor="middle" transform="rotate(-30 200 200)">
          ${name} • ${email} • ${date}
        </text>
      </svg>
    `;

    // Unicode-safe base64 encoding
    const encoded = btoa(unescape(encodeURIComponent(svg)));
    return `data:image/svg+xml;base64,${encoded}`;
  }, [user]);

  const logSecurityAttempt = useCallback(async (action: string) => {
    if (!isAuthenticated) return;
    try {
      await auditLogsApi.create({
        action,
        details: `Phát hiện hành động nghi vấn về an toàn hiển thị: ${action}`,
        status: 'WARNING',
        riskLevel: 'MEDIUM'
      });
    } catch (err) {
      console.error('Failed to log security attempt:', err);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const handleBlur = () => setIsBlurred(true);
    const handleFocus = () => setIsBlurred(false);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        setIsBlurred(true);
      } else {
        setIsBlurred(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Block PrintScreen (standard key code 44, but not always detectable in browser)
      if (e.key === 'PrintScreen' || e.keyCode === 44) {
        logSecurityAttempt('PRINT_SCREEN_ATTEMPT');
        // We can't actually stop the OS-level PrintScreen, but we can detect it
      }
      
      // Block Ctrl+P (Print)
      if (e.ctrlKey && e.key === 'p') {
        e.preventDefault();
        logSecurityAttempt('PRINT_ATTEMPT');
        alert('Tính năng in ấn đã bị vô hiệu hóa vì lý do bảo mật.');
      }

      // Block Ctrl+S (Save Page)
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        logSecurityAttempt('SAVE_PAGE_ATTEMPT');
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('contextmenu', handleContextMenu);

    return () => {
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [isAuthenticated, logSecurityAttempt]);

  if (!isAuthenticated) return <>{children}</>;

  return (
    <div className={`relative min-h-screen security-protected ${isBlurred ? 'protected-blur' : ''}`}>
      {/* Dynamic Watermark Overlay */}
      <div 
        className="fixed inset-0 pointer-events-none z-[9999] opacity-50"
        style={{ backgroundImage: `url("${createWatermark()}")`, backgroundRepeat: 'repeat' }}
      />
      
      {/* Content */}
      <div className="relative z-0">
        {children}
      </div>

      {/* Focus Loss Overlay Info */}
      {isBlurred && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-white/20 backdrop-blur-md">
          <div className="bg-slate-900 border border-white/10 p-6 rounded-2xl shadow-2xl text-center">
            <h3 className="text-white font-bold mb-2">Nexus Security Shield</h3>
            <p className="text-slate-400 text-sm">Nội dung đã bị ẩn để bảo vệ an toàn dữ liệu.</p>
          </div>
        </div>
      )}
    </div>
  );
};
