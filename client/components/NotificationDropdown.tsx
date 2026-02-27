import React, { useEffect, useState } from 'react';
import { Bell, Check, CheckCheck, AlertTriangle, Info, CheckCircle, X } from 'lucide-react';
import { notificationsApi } from '../api';
import { Notification } from '../types';

export const NotificationDropdown: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const data = await notificationsApi.getAll();
        setNotifications(data || []);
        setUnreadCount((data || []).filter((n: Notification) => !n.isRead).length);
      } catch (err) {
        console.error('Fetch notifications error:', err);
      }
    };

    fetchNotifications();
    // Poll every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleMarkAsRead = async (id: string) => {
    try {
      await notificationsApi.markAsRead(id);
      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, isRead: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Mark as read error:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationsApi.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Mark all as read error:', err);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'WARNING': return <AlertTriangle size={14} className="text-amber-500" />;
      case 'ALERT': return <AlertTriangle size={14} className="text-red-500" />;
      case 'SUCCESS': return <CheckCircle size={14} className="text-emerald-500" />;
      default: return <Info size={14} className="text-blue-500" />;
    }
  };

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className={`relative p-3 bg-slate-50 text-slate-400 hover:bg-slate-100 rounded-2xl transition-all hover:text-blue-600`}
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-100 rounded-3xl shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h4 className="font-bold text-slate-800">Thông báo</h4>
            {unreadCount > 0 && (
              <button 
                onClick={handleMarkAllAsRead}
                className="text-xs text-blue-600 hover:underline flex items-center gap-1"
              >
                <CheckCheck size={12} /> Đánh dấu tất cả đã đọc
              </button>
            )}
          </div>
          
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">
                Chưa có thông báo nào
              </div>
            ) : (
              notifications.slice(0, 10).map((notif) => (
                <div 
                  key={notif.id} 
                  className={`p-4 border-b border-slate-50 hover:bg-slate-50 transition-colors ${
                    !notif.isRead ? 'bg-blue-50/50' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">{getTypeIcon(notif.type)}</div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold ${!notif.isRead ? 'text-slate-900' : 'text-slate-600'}`}>
                        {notif.title}
                      </p>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">{notif.message}</p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-[10px] text-slate-400">
                          {new Date(notif.createdAt).toLocaleString('vi-VN', {
                            hour: '2-digit',
                            minute: '2-digit',
                            day: '2-digit',
                            month: '2-digit'
                          })}
                        </span>
                        {!notif.isRead && (
                          <button
                            onClick={() => handleMarkAsRead(notif.id)}
                            className="text-[10px] text-blue-600 hover:underline flex items-center gap-1"
                          >
                            <Check size={10} /> Đánh dấu đã đọc
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {notifications.length > 0 && (
            <div className="p-3 border-t border-slate-100">
              <button className="w-full text-center text-xs text-blue-600 font-semibold py-2 hover:bg-blue-50 rounded-xl transition-colors">
                Xem tất cả thông báo
              </button>
            </div>
          )}
        </div>
      )}

      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};

