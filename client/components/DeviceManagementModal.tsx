import React, { useState, useEffect } from 'react';
import { X, Smartphone, Trash2, Clock, CheckCircle, AlertTriangle, Edit2, Check, MapPin, Globe } from 'lucide-react';
import { e2eeApi } from '../api';

interface Device {
  deviceId: string;
  deviceName: string;
  ipAddress?: string;
  userAgent?: string;
  isActive: boolean;
  lastActiveAt: string;
  createdAt: string;
}

export const DeviceManagementModal = ({ onClose }: { onClose: () => void }) => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const currentDeviceId = localStorage.getItem(`e2ee_device_id_` + (JSON.parse(localStorage.getItem('user') || '{}')?.id));

  // Helper function: Parse UserAgent
  const formatDeviceName = (ua: string) => {
    if (!ua || typeof ua !== 'string') return 'Thiết bị không tên';
    if (!ua.includes('Mozilla/') && !ua.includes('AppleWebKit')) return ua;
    
    let browser = 'Unknown Browser';
    if (ua.includes('Edg/')) browser = 'Edge';
    else if (ua.includes('OPR/') || ua.includes('Opera/')) browser = 'Opera';
    else if (ua.includes('Chrome/')) browser = 'Chrome';
    else if (ua.includes('Firefox/')) browser = 'Firefox';
    else if (ua.includes('Safari/') && !ua.includes('Chrome')) browser = 'Safari';

    let os = 'Unknown OS';
    if (ua.includes('Windows')) os = 'Windows';
    else if (ua.includes('Macintosh') || ua.includes('Mac OS')) os = 'MacOS';
    else if (ua.includes('Android')) os = 'Android';
    else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';
    else if (ua.includes('Linux')) os = 'Linux';

    return `${browser} trên ${os}`;
  };

  useEffect(() => {
    loadDevices();
  }, []);

  const loadDevices = async () => {
    try {
      setLoading(true);
      const res = await e2eeApi.getMyDevices();
      setDevices(res.devices || []);
    } catch (err) {
      setError('Cannot load devices');
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async (deviceId: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa thiết bị này? Thiết bị sẽ bị đăng xuất khỏi E2EE và không thể giải mã tin nhắn E2EE sắp tới nữa!')) {
      return;
    }

    try {
      await e2eeApi.revokeDevice(deviceId);
      if (deviceId === currentDeviceId) {
        alert('Bạn đã xóa thiết bị hiện tại. Vui lòng tải lại trang để thiết lập E2EE mới.');
        window.location.reload();
      } else {
        setDevices(devices.filter(d => d.deviceId !== deviceId));
      }
    } catch (err) {
      alert('Không thể xóa thiết bị');
    }
  };

  const handleRename = async (deviceId: string) => {
    if (!editName.trim()) {
      setEditingId(null);
      return;
    }
    try {
      await e2eeApi.renameDevice(deviceId, editName);
      setDevices(devices.map(d => d.deviceId === deviceId ? { ...d, deviceName: editName.trim() } : d));
      setEditingId(null);
    } catch (err) {
      alert('Không thể cập nhật tên thiết bị');
    }
  };

  return (
    <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl w-[500px] p-6 max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Smartphone className="w-6 h-6 text-blue-600" />
            <h3 className="text-xl font-bold text-slate-800">Quản lý Thiết Bị E2EE</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
            <X size={20} />
          </button>
        </div>
        
        <p className="text-sm text-slate-500 mb-6">
          Các thiết bị đã được mã hóa đầu cuối (E2EE) của bạn. Hãy xóa nếu bạn thấy thiết bị lạ hoặc đã mất điện thoại.
        </p>

        {loading ? (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : error ? (
          <div className="p-4 bg-red-50 text-red-600 rounded-lg text-sm flex items-center gap-2">
            <AlertTriangle size={16} /> {error}
          </div>
        ) : devices.length === 0 ? (
          <div className="text-center p-8 text-slate-500 text-sm">Chưa có thiết bị nào</div>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-3">
            {devices.map(device => {
              const isCurrent = device.deviceId === currentDeviceId;
              return (
                <div key={device.deviceId} className={`p-4 rounded-xl border transition-all hover:shadow-md ${isCurrent ? 'border-blue-300 bg-blue-50/50' : 'border-slate-200 bg-white'}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Smartphone className={`w-4 h-4 ${isCurrent ? 'text-blue-500' : 'text-slate-400'}`} />
                        {editingId === device.deviceId ? (
                          <div className="flex items-center gap-1">
                            <input 
                              type="text" 
                              value={editName}
                              autoFocus
                              onChange={(e) => setEditName(e.target.value)}
                              onKeyDown={(e) => { if (e.key === 'Enter') handleRename(device.deviceId); else if (e.key === 'Escape') setEditingId(null); }}
                              className="px-2 py-0.5 text-sm border border-blue-300 rounded outline-none w-40"
                            />
                            <button onClick={() => handleRename(device.deviceId)} className="p-1 text-blue-600 hover:bg-blue-100 rounded">
                              <Check size={14} />
                            </button>
                            <button onClick={() => setEditingId(null)} className="p-1 text-slate-400 hover:bg-slate-100 rounded">
                              <X size={14} />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            <span className="font-semibold text-slate-800 text-sm">
                              {/* Nếu tên do máy gen (đã parse) hoặc gốc, format nó, còn người dùng tự đổi thì giữ nguyên */}
                              {formatDeviceName(device.deviceName) === 'Thiết bị không tên' || 
                               (device.deviceName.includes('Mozilla/') || device.deviceName.includes('AppleWeb')) 
                               ? formatDeviceName(device.deviceName) 
                               : device.deviceName}
                            </span>
                            <button 
                              onClick={() => { setEditingId(device.deviceId); setEditName(device.deviceName.includes('Mozilla/') || device.deviceName.includes('AppleWeb') ? formatDeviceName(device.deviceName) : device.deviceName); }}
                              className="p-1 text-slate-300 hover:text-blue-500 transition-colors rounded hover:bg-slate-50"
                              title="Tùy chỉnh tên thiết bị"
                            >
                              <Edit2 size={12} />
                            </button>
                          </div>
                        )}
                        {isCurrent && <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-600 border border-blue-200 shadow-sm">THIẾT BỊ NÀY</span>}
                        {device.isActive && !isCurrent && (
                          <span className="flex items-center gap-1 text-[10px] text-emerald-600 font-medium bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100"><CheckCircle size={10} /> Đã liên kết</span>
                        )}
                      </div>
                      
                      {/* Hiển thị chi tiết UserAgent thu gọn */}
                      <p className="text-[10px] text-slate-400 font-mono bg-slate-100 px-2 py-1 rounded truncate max-w-[300px]" title={device.deviceName}>
                        {device.deviceName}
                      </p>

                      <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                        <span className="flex items-center gap-1 font-medium" title="Khoảng thời gian hoạt động">
                          <Clock size={12} className={isCurrent ? 'text-blue-400' : 'text-slate-400'} /> 
                          {new Date(device.lastActiveAt).toLocaleString('vi-VN')}
                        </span>
                        {(device.ipAddress) && (
                          <span className="flex items-center gap-1 text-rose-600/80 font-mono bg-rose-50 px-1.5 py-0.5 rounded border border-rose-100" title="Địa chỉ IP truy cập">
                            <Globe size={10} />
                            {device.ipAddress === '::1' || device.ipAddress === '127.0.0.1' ? 'Mạng nội bộ' : device.ipAddress}
                          </span>
                        )}
                        <span className="font-mono text-[10px] text-slate-400 ml-auto" title="Mã nhận diện">ID: {device.deviceId.substring(0, 8)}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRevoke(device.deviceId)}
                      className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all flex shrink-0"
                      title="Thu hồi/Xóa thiết bị"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
