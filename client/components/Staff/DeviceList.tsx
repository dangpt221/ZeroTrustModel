import React, { useEffect, useState } from 'react';
import { Smartphone, Monitor, Trash2, CheckCircle2, RefreshCw } from 'lucide-react';
import { useE2EE } from '../../context/E2EEContext';
import { e2eeApi } from '../../api';

export const DeviceList: React.FC = () => {
  const { deviceId } = useE2EE();
  const [devices, setDevices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDevices = async () => {
    try {
      setLoading(true);
      const res = await e2eeApi.getMyDevices();
      setDevices(res.devices || []);
    } catch (err) {
      console.error('Failed to fetch devices:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDevices();
  }, []);

  const handleRevoke = async (id: string) => {
    if (confirm('Báo động: Bạn có chắc chắn muốn ngắt kết nối và đăng xuất thiết bị này khỏi hệ thống? Khóa E2EE của thiết bị đó sẽ bị hủy vĩnh viễn.')) {
      try {
        await e2eeApi.revokeDevice(id);
        fetchDevices();
      } catch (err) {
        console.error(err);
        alert('Có lỗi xảy ra khi hủy thiết bị.');
      }
    }
  };

  const parseDeviceName = (ua: string) => {
    if (!ua) return 'Thiết bị không xác định';
    if (ua.includes('Windows')) return 'Windows PC';
    if (ua.includes('Mac OS') || ua.includes('Macintosh')) return 'MacBook / MacOS';
    if (ua.includes('iPhone')) return 'iPhone';
    if (ua.includes('iPad')) return 'iPad';
    if (ua.includes('Android')) return 'Android Device';
    if (ua.includes('Linux')) return 'Linux Desktop';
    return ua.slice(0, 20) + '...';
  };

  const isMobile = (ua: string) => {
    if (!ua) return false;
    return /Mobile|Android|iP(hone|od|ad)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleString('vi-VN', {
      hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric'
    });
  };

  return (
    <div className="bg-white p-4 md:p-8 rounded-[32px] border border-slate-100 shadow-sm space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
          <Monitor size={16} className="text-emerald-500" /> Thiết bị được tin cậy
        </h3>
        <button onClick={fetchDevices} disabled={loading} className="text-[10px] font-bold text-emerald-600 uppercase flex items-center gap-1 hover:underline disabled:opacity-50 disabled:cursor-not-allowed">
          <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Tải lại
        </button>
      </div>

      <div className="divide-y divide-slate-50 min-h-[100px]">
        {loading && devices.length === 0 ? (
           <div className="py-4 text-center text-sm font-bold text-slate-400 animate-pulse">Đang định vị danh sách thiết bị...</div>
        ) : (
          devices.map((device: any) => {
            const isCurrent = device.deviceId === deviceId;
            const uaString = device.deviceName || device.userAgent || '';
            const mobile = isMobile(uaString);
            return (
              <div key={device.deviceId} className="py-4 flex items-center justify-between group transition-all duration-300 hover:bg-slate-50 -mx-4 px-4 rounded-2xl">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-2xl ${isCurrent ? 'bg-emerald-50 text-emerald-600 shadow-sm' : 'bg-slate-100 text-slate-400'}`}>
                    {!mobile ? <Monitor size={20} /> : <Smartphone size={20} />}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800 flex items-center gap-2">
                      {parseDeviceName(uaString)}
                      {isCurrent && <span className="text-[10px] shadow-sm bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-2 py-0.5 rounded-full font-black tracking-widest uppercase">Thiết bị hiện tại</span>}
                    </p>
                    <p className="text-[10px] text-slate-400 font-medium mt-1 uppercase tracking-wider">
                      IP: <span className="text-slate-600">{device.ipAddress || 'Ẩn'}</span> • {isCurrent ? <span className="text-emerald-500 font-bold">Đang Online</span> : formatDate(device.lastActiveAt)}
                    </p>
                  </div>
                </div>
                {!isCurrent && (
                  <button onClick={() => handleRevoke(device.deviceId)} title="Thu hồi / Đăng xuất thiết bị" className="p-2 text-rose-300 hover:text-white hover:bg-rose-500 rounded-xl transition-all opacity-0 group-hover:opacity-100 shadow-sm">
                    <Trash2 size={18} />
                  </button>
                )}
              </div>
            );
          })
        )}
        {!loading && devices.length === 0 && (
          <div className="py-4 text-center text-sm font-bold text-slate-400">Không có bất kỳ thiết bị nào truy cập.</div>
        )}
      </div>

      <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-start gap-3 mt-4">
        <CheckCircle2 className="text-emerald-500 shrink-0 mt-0.5" size={18} />
        <p className="text-[11px] text-emerald-800 font-medium leading-relaxed">
          Tài khoản của bạn đang áp dụng mô hình <b>Zero Trust Framework</b>. Hệ thống Backend đã tự động thu thập chuỗi User-Agent, vị trí IP và đóng dấu khóa công khai E2EE lên từng thiết bị riêng biệt.
        </p>
      </div>
    </div>
  );
};
