
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
    ipWhitelist: ['192.168.1.0/24', '10.0.0.1'],
    geoBlockingEnabled: false,
    allowedCountries: ['VN']
  });
  const [newIP, setNewIP] = useState('');
  const [newCountry, setNewCountry] = useState('');
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const data = await zeroTrustApi.getConfig();
        if (data) {
          setConfig(prev => ({ ...prev, ...data }));
        }
      } catch (err) {
        console.error('Error fetching zero trust config:', err);
      } finally {
        setIsLoaded(true);
      }
    };
    fetchConfig();
  }, []);

  useEffect(() => {
    if (!isLoaded) return;

    const handler = setTimeout(async () => {
      try {
        await zeroTrustApi.updateConfig(config);
      } catch (err) {
        console.error('Error auto-saving config:', err);
      }
    }, 500);

    return () => clearTimeout(handler);
  }, [config, isLoaded]);

  const handleAddIP = () => {
    if (newIP && !config.ipWhitelist?.includes(newIP)) {
      setConfig({ ...config, ipWhitelist: [...(config.ipWhitelist || []), newIP] });
      setNewIP('');
    }
  };

  const handleRemoveIP = (ip: string) => {
    setConfig({ ...config, ipWhitelist: (config.ipWhitelist || []).filter(i => i !== ip) });
  };

  const handleAddCountry = () => {
    const country = newCountry.toUpperCase().trim();
    if (country && country.length === 2 && !config.allowedCountries?.includes(country)) {
      setConfig({ ...config, allowedCountries: [...(config.allowedCountries || []), country] });
      setNewCountry('');
    }
  };

  const handleRemoveCountry = (country: string) => {
    setConfig({ ...config, allowedCountries: (config.allowedCountries || []).filter(c => c !== country) });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex justify-between items-end">
        <div className="relative">
          <div className="absolute -left-4 top-0 w-1.5 h-full bg-slate-800 rounded-full shadow-[0_0_15px_rgba(30,41,59,0.5)]"></div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight italic uppercase">CẤU HÌNH ZERO TRUST</h2>
          <p className="text-slate-500 font-medium mt-1">Thiết lập các rào cản bảo mật và quy tắc xác thực động cho hệ thống</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* Auth Section */}
        <div className="bg-white p-4 md:p-8 rounded-[32px] border border-slate-100 shadow-sm space-y-6">
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
        <div className="bg-white p-4 md:p-8 rounded-[32px] border border-slate-100 shadow-sm space-y-6">
          <h3 className="font-black text-slate-800 flex items-center gap-2 uppercase text-xs tracking-widest text-emerald-600">
            <Globe size={20} /> Kiểm soát Mạng lưới
          </h3>
          
          <div className="space-y-6">
            {/* Lớp 1: IP Whitelist */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-slate-700">Chặn IP nội bộ (Whitelist)</p>
                <p className="text-[11px] text-slate-400">Chỉ cho phép truy cập từ các IP cấu hình sẵn</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" checked={!config.allowExternalIP} className="sr-only peer" onChange={() => setConfig({...config, allowExternalIP: !config.allowExternalIP})} />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>

            <div className={`transition-all duration-300 overflow-hidden ${!config.allowExternalIP ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Whitelist IPs Hiện tại</p>
                <div className="flex flex-wrap gap-2">
                  {(config.ipWhitelist || []).map(ip => (
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
                    placeholder="Nhập IP/CIDR (vd: 192.168.1.0/24)"
                    className="flex-1 text-xs px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                    onKeyPress={(e) => e.key === 'Enter' && handleAddIP()}
                  />
                  <button onClick={handleAddIP} className="px-3 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors">
                    <Plus size={14} />
                  </button>
                </div>
              </div>
            </div>

            <hr className="border-slate-100 my-2" />

            {/* Lớp 2: Geo-blocking */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-slate-700">Chặn IP Quốc tế (Geo-blocking)</p>
                <p className="text-[11px] text-slate-400">Chỉ cho phép IP từ những quốc gia nhất định</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" checked={config.geoBlockingEnabled || false} className="sr-only peer" onChange={() => setConfig({...config, geoBlockingEnabled: !config.geoBlockingEnabled})} />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>

            <div className={`transition-all duration-300 overflow-hidden ${config.geoBlockingEnabled ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Quốc gia được phép (Mã 2 ký tự)</p>
                <div className="flex flex-wrap gap-2">
                  {(config.allowedCountries || []).map(country => (
                    <span key={country} className="text-[10px] font-bold bg-white px-2 py-1 rounded-lg border border-slate-200 flex items-center gap-1">
                      {country}
                      <button onClick={() => handleRemoveCountry(country)} className="text-slate-400 hover:text-rose-500 ml-1">
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="mt-3 flex gap-2">
                  <input
                    type="text"
                    value={newCountry}
                    onChange={(e) => setNewCountry(e.target.value)}
                    placeholder="Mã Quốc gia (vd: VN, US...)"
                    className="flex-1 text-xs px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none uppercase"
                    maxLength={2}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddCountry()}
                  />
                  <button onClick={handleAddCountry} className="px-3 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors">
                    <Plus size={14} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Device Section */}
        <div className="bg-white p-4 md:p-8 rounded-[32px] border border-slate-100 shadow-sm space-y-6">
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
        <div className="bg-slate-900 p-4 md:p-8 rounded-[32px] text-white space-y-6 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 md:p-8 opacity-10">
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
