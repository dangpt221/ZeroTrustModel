
import React, { useState, useEffect } from 'react';
import { Fingerprint, ShieldAlert, Monitor, Globe, Bell, Zap, Save, X, Plus, CheckCircle } from 'lucide-react';
import { zeroTrustApi } from '../../api';

export const ZeroTrustSettings: React.FC = () => {
  const [config, setConfig] = useState({
    mfaRequired: true,
    maxLoginFails: 5,
    trustScoreThreshold: 70,
    allowExternalIP: false,
    alertOnNewDevice: true,
    ipWhitelist: ['192.168.1.0/24', '10.0.0.1']
  });
  const [newIP, setNewIP] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const data = await zeroTrustApi.getConfig();
        if (data) {
          setConfig(prev => ({ ...prev, ...data }));
        }
      } catch (err) {
        console.error('Error fetching zero trust config:', err);
      }
    };
    fetchConfig();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await zeroTrustApi.updateConfig(config);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      alert('Lưu cấu hình thành công!');
    } catch (err) {
      console.error('Error saving config:', err);
      alert('Lưu cấu hình thất bại!');
    } finally {
      setSaving(false);
    }
  };

  const handleAddIP = () => {
    if (newIP && !config.ipWhitelist.includes(newIP)) {
      setConfig({ ...config, ipWhitelist: [...config.ipWhitelist, newIP] });
      setNewIP('');
    }
  };

  const handleRemoveIP = (ip: string) => {
    setConfig({ ...config, ipWhitelist: config.ipWhitelist.filter(i => i !== ip) });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-black text-slate-800 uppercase italic">Cấu hình Zero Trust</h2>
          <p className="text-slate-500 text-sm">Thiết lập các rào cản bảo mật và quy tắc xác thực động</p>
        </div>
        <button onClick={handleSave} disabled={saving} className="bg-slate-900 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-xl hover:bg-slate-800 transition-all disabled:opacity-50">
          {saved ? <CheckCircle size={18} className="text-emerald-400" /> : <Save size={18} />}
          {saving ? 'Đang lưu...' : saved ? 'Đã lưu!' : 'Lưu cấu hình'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Auth Section */}
        <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm space-y-6">
          <h3 className="font-black text-slate-800 flex items-center gap-2 uppercase text-xs tracking-widest text-blue-600">
            <Fingerprint size={20} /> Chính sách Xác thực
          </h3>
          
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-slate-700">Yêu cầu MFA toàn bộ</p>
                <p className="text-[11px] text-slate-400">Bắt buộc 2FA cho mọi lần đăng nhập</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" checked={config.mfaRequired} className="sr-only peer" onChange={() => setConfig({...config, mfaRequired: !config.mfaRequired})} />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div>
              <p className="text-sm font-bold text-slate-700 mb-2">Số lần đăng nhập sai tối đa</p>
              <input 
                type="range" min="1" max="10" 
                value={config.maxLoginFails} 
                onChange={(e) => setConfig({...config, maxLoginFails: parseInt(e.target.value)})}
                className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600" 
              />
              <div className="flex justify-between text-[10px] font-bold text-slate-400 mt-2 uppercase">
                <span>Khắt khe: 1</span>
                <span className="text-blue-600">Hiện tại: {config.maxLoginFails} lần</span>
                <span>Nới lỏng: 10</span>
              </div>
            </div>
          </div>
        </div>

        {/* Network/IP Section */}
        <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm space-y-6">
          <h3 className="font-black text-slate-800 flex items-center gap-2 uppercase text-xs tracking-widest text-emerald-600">
            <Globe size={20} /> Kiểm soát Mạng lưới
          </h3>
          
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-slate-700">Chặn IP ngoại vi</p>
                <p className="text-[11px] text-slate-400">Chỉ cho phép IP trong Whitelist công ty</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" checked={!config.allowExternalIP} className="sr-only peer" onChange={() => setConfig({...config, allowExternalIP: !config.allowExternalIP})} />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Whitelist IPs Hiện tại</p>
              <div className="flex flex-wrap gap-2">
                {config.ipWhitelist.map(ip => (
                  <span key={ip} className="text-[10px] font-bold bg-white px-2 py-1 rounded-lg border border-slate-200 flex items-center gap-1">
                    {ip}
                    <button onClick={() => handleRemoveIP(ip)} className="text-slate-400 hover:text-rose-500 ml-1">
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
              <div className="mt-3 flex gap-2">
                <input
                  type="text"
                  value={newIP}
                  onChange={(e) => setNewIP(e.target.value)}
                  placeholder="Nhập IP mới (vd: 192.168.1.100)"
                  className="flex-1 text-xs px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  onKeyPress={(e) => e.key === 'Enter' && handleAddIP()}
                />
                <button onClick={handleAddIP} className="px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
                  <Plus size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Device Section */}
        <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm space-y-6">
          <h3 className="font-black text-slate-800 flex items-center gap-2 uppercase text-xs tracking-widest text-indigo-600">
            <Monitor size={20} /> Quản lý Thiết bị
          </h3>
          
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-slate-700">Cảnh báo thiết bị mới</p>
                <p className="text-[11px] text-slate-400">Gửi OTP email khi đăng nhập từ máy lạ</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" checked={config.alertOnNewDevice} className="sr-only peer" onChange={() => setConfig({...config, alertOnNewDevice: !config.alertOnNewDevice})} />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Trust Score Engine */}
        <div className="bg-slate-900 p-8 rounded-[32px] text-white space-y-6 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <Zap size={60} />
          </div>
          <h3 className="font-black flex items-center gap-2 uppercase text-xs tracking-widest text-amber-400">
            <Zap size={20} /> Trust Score Engine
          </h3>
          
          <div>
            <p className="text-sm font-bold mb-2">Ngưỡng tin cậy tối thiểu</p>
            <input 
              type="range" min="0" max="100" 
              value={config.trustScoreThreshold} 
              onChange={(e) => setConfig({...config, trustScoreThreshold: parseInt(e.target.value)})}
              className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-amber-400" 
            />
            <p className="text-[10px] text-slate-400 mt-4 leading-relaxed">
              Tài khoản có Trust Score thấp hơn <span className="text-amber-400 font-bold">{config.trustScoreThreshold}%</span> sẽ tự động bị yêu cầu xác thực lại danh tính hoặc bị hạn chế quyền truy cập tài liệu nhạy cảm.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
