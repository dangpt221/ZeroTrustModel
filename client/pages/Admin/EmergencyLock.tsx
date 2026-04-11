
import React, { useEffect, useState } from 'react';
import {
  ShieldAlert, Shield, Unlock, AlertTriangle, Lock, Users,
  FileText, Link2, Eye, Clock, Zap, RefreshCw, Activity,
  Server, UserX, Building2, Bug
} from 'lucide-react';
import { Modal } from '../../components/Admin/Modal';
import { emergencyApi, EmergencyStatus, AnomalyStats } from '../../api';

export const EmergencyLock: React.FC = () => {
  const [status, setStatus] = useState<EmergencyStatus | null>(null);
  const [anomalyStats, setAnomalyStats] = useState<AnomalyStats | null>(null);
  const [activeLinks, setActiveLinks] = useState<any[]>([]);
  const [activeSessions, setActiveSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState(false);
  const [deactivating, setDeactivating] = useState(false);
  const [revokingLink, setRevokingLink] = useState<string | null>(null);

  // Activate modal
  const [showActivateModal, setShowActivateModal] = useState(false);
  const [lockType, setLockType] = useState<EmergencyStatus['lockType']>('SYSTEM');
  const [lockReason, setLockReason] = useState('');
  const [autoUnlockMinutes, setAutoUnlockMinutes] = useState(0);

  // Anomaly detail modal
  const [showAnomalyDetail, setShowAnomalyDetail] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [statusData, anomalyData, linksData, sessionsData] = await Promise.all([
        emergencyApi.getStatus(),
        emergencyApi.getAnomalyStats(),
        emergencyApi.getActiveLinks(),
        emergencyApi.getActiveSessions(),
      ]);
      setStatus(statusData);
      setAnomalyStats(anomalyData);
      setActiveLinks(linksData);
      setActiveSessions(sessionsData);
    } catch (err) {
      console.error('Error loading emergency data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleActivate = async () => {
    if (!lockReason.trim()) {
      alert('Vui lòng nhập lý do khóa khẩn cấp!');
      return;
    }
    if (!lockType) {
      alert('Vui lòng chọn loại khóa!');
      return;
    }

    setActivating(true);
    try {
      await emergencyApi.activate({
        lockType,
        reason: lockReason,
        autoUnlockMinutes: autoUnlockMinutes > 0 ? autoUnlockMinutes : undefined,
      });
      alert('Kích hoạt khóa khẩn cấp thành công!');
      setShowActivateModal(false);
      setLockReason('');
      setAutoUnlockMinutes(0);
      loadData();
    } catch (err: any) {
      alert('Thao tác thất bại: ' + (err.message || 'Lỗi không xác định'));
    } finally {
      setActivating(false);
    }
  };

  const handleDeactivate = async () => {
    if (!confirm('Bạn có chắc chắn muốn bỏ khóa khẩn cấp? Hệ thống sẽ hoạt động bình thường trở lại.')) return;

    setDeactivating(true);
    try {
      await emergencyApi.deactivate();
      alert('Đã bỏ khóa khẩn cấp!');
      loadData();
    } catch (err: any) {
      alert('Thao tác thất bại: ' + (err.message || 'Lỗi không xác định'));
    } finally {
      setDeactivating(false);
    }
  };

  const handleRevokeLink = async (downloadId: string) => {
    if (!confirm('Thu hồi link tải này?')) return;
    setRevokingLink(downloadId);
    try {
      await emergencyApi.revokeLink(downloadId);
      alert('Đã thu hồi link!');
      loadData();
    } catch (err: any) {
      alert('Thao tác thất bại!');
    } finally {
      setRevokingLink(null);
    }
  };

  const getLockTypeInfo = (type: EmergencyStatus['lockType']) => {
    switch (type) {
      case 'SYSTEM': return { icon: Server, color: 'rose', label: 'Khóa toàn hệ thống', desc: 'Tất cả user (trừ Admin) bị khóa đăng nhập' };
      case 'DOCUMENT': return { icon: FileText, color: 'amber', label: 'Khóa tài liệu', desc: 'Khóa tài liệu cụ thể' };
      case 'USER': return { icon: UserX, color: 'red', label: 'Khóa người dùng', desc: 'Khóa tài khoản cụ thể' };
      case 'DEPARTMENT': return { icon: Building2, color: 'orange', label: 'Khóa phòng ban', desc: 'Khóa tất cả user trong phòng ban' };
      case 'BREACH_DETECTED': return { icon: Bug, color: 'rose', label: 'Phát hiện xâm nhập', desc: 'Khóa toàn bộ + khóa tài liệu CONFIDENTIAL' };
      default: return { icon: Shield, color: 'slate', label: 'Không có', desc: '' };
    }
  };

  const lockTypeInfo = status?.lockType ? getLockTypeInfo(status.lockType) : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-slate-200 border-t-emerald-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex items-center justify-between">
        
        <button
          onClick={loadData}
          className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
          title="Làm mới dữ liệu"
        >
          <RefreshCw size={20} />
        </button>
      </div>

      {/* Emergency Status Card */}
      <div className={`rounded-[32px] border-2 p-4 md:p-8 transition-all ${
        status?.isLocked
          ? 'bg-rose-50 border-rose-200 animate-pulse'
          : 'bg-emerald-50 border-emerald-200'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className={`p-5 rounded-2xl ${status?.isLocked ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'}`}>
              {status?.isLocked ? <ShieldAlert size={40} /> : <Shield size={40} />}
            </div>
            <div>
              <h3 className={`text-2xl font-black ${status?.isLocked ? 'text-rose-700' : 'text-emerald-700'}`}>
                {status?.isLocked ? 'HỆ THỐNG BỊ KHÓA' : 'HỆ THỐNG HOẠT ĐỘNG BÌNH THƯỜNG'}
              </h3>
              {status?.isLocked && lockTypeInfo && (
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-xs font-black px-2 py-0.5 rounded-full bg-rose-100 text-rose-600`}>
                    {lockTypeInfo.label}
                  </span>
                  <span className="text-sm text-rose-600">
                    {status.reason && `— ${status.reason}`}
                  </span>
                </div>
              )}
              {status?.lockedAt && (
                <p className="text-xs text-slate-500 mt-1">
                  Khóa lúc: {new Date(status.lockedAt).toLocaleString('vi-VN')}
                  {status.lockedBy && ` bởi ${status.lockedBy}`}
                  {status.autoUnlockAt && ` • Tự động mở: ${new Date(status.autoUnlockAt).toLocaleString('vi-VN')}`}
                </p>
              )}
            </div>
          </div>
          <div className="flex gap-3">
            {!status?.isLocked ? (
              <button
                onClick={() => setShowActivateModal(true)}
                className="px-6 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl font-bold shadow-lg shadow-rose-500/20 transition-all flex items-center gap-2"
              >
                <Zap size={18} /> Kích hoạt khóa khẩn cấp
              </button>
            ) : (
              <button
                onClick={handleDeactivate}
                disabled={deactivating}
                className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2"
              >
                <Unlock size={18} /> {deactivating ? 'Đang xử lý...' : 'Bỏ khóa khẩn cấp'}
              </button>
            )}
          </div>
        </div>

        {/* Affected entities */}
        {status?.isLocked && (status.affectedUsers?.length || status.affectedDocuments?.length || status.affectedDepartments?.length) && (
          <div className="mt-6 pt-6 border-t border-rose-200 grid grid-cols-3 gap-4">
            {status.affectedUsers?.length ? (
              <div className="bg-white/60 rounded-xl p-4">
                <div className="flex items-center gap-2 text-rose-700 mb-2">
                  <Users size={16} />
                  <span className="text-xs font-black uppercase">Users bị khóa</span>
                </div>
                <p className="text-lg font-black text-rose-600">{status.affectedUsers.length}</p>
              </div>
            ) : null}
            {status.affectedDocuments?.length ? (
              <div className="bg-white/60 rounded-xl p-4">
                <div className="flex items-center gap-2 text-amber-700 mb-2">
                  <FileText size={16} />
                  <span className="text-xs font-black uppercase">Tài liệu bị khóa</span>
                </div>
                <p className="text-lg font-black text-amber-600">{status.affectedDocuments.length}</p>
              </div>
            ) : null}
            {status.affectedDepartments?.length ? (
              <div className="bg-white/60 rounded-xl p-4">
                <div className="flex items-center gap-2 text-orange-700 mb-2">
                  <Building2 size={16} />
                  <span className="text-xs font-black uppercase">Phòng ban bị khóa</span>
                </div>
                <p className="text-lg font-black text-orange-600">{status.affectedDepartments.length}</p>
              </div>
            ) : null}
          </div>
        )}
      </div>

      {/* Anomaly Detection */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Anomaly Stats */}
        <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm p-4 md:p-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-amber-100 text-amber-600 rounded-xl">
                <AlertTriangle size={24} />
              </div>
              <div>
                <h4 className="font-black text-slate-800 text-lg">Phát hiện bất thường</h4>
                <p className="text-xs text-slate-400">Hành vi đáng nghi ngờ trong hệ thống</p>
              </div>
            </div>
            {anomalyStats && (
              <div className="text-right">
                <p className="text-3xl font-black text-amber-600">{anomalyStats.total}</p>
                <p className="text-xs text-slate-400">tổng cảnh báo</p>
              </div>
            )}
          </div>

          {anomalyStats && (
            <div className="space-y-3">
              {Object.entries(anomalyStats.byType).map(([type, count]) => (
                <div key={type} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                  <span className="text-xs font-bold text-slate-600">{type.replace(/_/g, ' ')}</span>
                  <span className={`text-sm font-black px-2 py-0.5 rounded ${
                    type === 'MASS_DOWNLOAD' ? 'bg-rose-100 text-rose-600' :
                    type === 'EXCESSIVE_DOWNLOAD' ? 'bg-amber-100 text-amber-600' :
                    'bg-slate-100 text-slate-600'
                  }`}>
                    {String(count)}
                  </span>
                </div>
              ))}
            </div>
          )}

          {anomalyStats?.critical ? (
            <div className="mt-4 p-3 bg-rose-50 rounded-xl border border-rose-100 flex items-center gap-2">
              <Bug size={16} className="text-rose-500" />
              <span className="text-xs font-bold text-rose-600">
                {anomalyStats.critical} sự cố CRITICAL — có thể đã tự động khóa tài khoản
              </span>
            </div>
          ) : null}

          <button
            onClick={() => setShowAnomalyDetail(true)}
            className="mt-4 w-full py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50 rounded-xl transition-all flex items-center justify-center gap-2"
          >
            <Eye size={16} /> Xem chi tiết bất thường
          </button>
        </div>

        {/* Active Download Links */}
        <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm p-4 md:p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-sky-100 text-sky-600 rounded-xl">
              <Link2 size={24} />
            </div>
            <div>
              <h4 className="font-black text-slate-800 text-lg">Secure Links đang hoạt động</h4>
              <p className="text-xs text-slate-400">Link tải có thời hạn & nonce chống replay</p>
            </div>
          </div>

          {activeLinks.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <Link2 size={32} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">Không có link nào đang hoạt động</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {activeLinks.map((link) => (
                <div key={link.downloadId} className="p-3 bg-slate-50 rounded-xl">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-700 truncate">{link.documentTitle}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {link.userName} • Hết hạn: {new Date(link.expiresAt).toLocaleString('vi-VN')}
                      </p>
                      <p className="text-[10px] text-sky-500 mt-0.5">
                        {link.usedDownloads}/{link.maxDownloads} lượt tải
                      </p>
                    </div>
                    <button
                      onClick={() => handleRevokeLink(link.downloadId)}
                      disabled={revokingLink === link.downloadId}
                      className="p-1.5 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all flex-shrink-0"
                      title="Thu hồi link"
                    >
                      <Lock size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Active Streaming Sessions */}
      <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm p-4 md:p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-emerald-100 text-emerald-600 rounded-xl">
            <Activity size={24} />
          </div>
          <div>
            <h4 className="font-black text-slate-800 text-lg">Streaming Sessions đang hoạt động</h4>
            <p className="text-xs text-slate-400">Tài liệu đang xem trực tuyến (không lưu trên máy)</p>
          </div>
        </div>

        {activeSessions.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            <Eye size={32} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">Không có session đang hoạt động</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                <tr>
                  <th className="pb-3">Tài liệu</th>
                  <th className="pb-3">Người xem</th>
                  <th className="pb-3">Bắt đầu</th>
                  <th className="pb-3">Hoạt động cuối</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {activeSessions.map((session) => (
                  <tr key={session.sessionId} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 text-sm font-medium text-slate-700">{session.documentTitle}</td>
                    <td className="py-3 text-xs text-slate-500">{session.userName}</td>
                    <td className="py-3 text-xs text-slate-500">{new Date(session.startedAt).toLocaleString('vi-VN')}</td>
                    <td className="py-3 text-xs text-slate-500">{new Date(session.lastActivity).toLocaleString('vi-VN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Activate Emergency Lock Modal */}
      <Modal isOpen={showActivateModal} onClose={() => setShowActivateModal(false)} title="Kích hoạt khóa khẩn cấp" size="lg">
        <div className="space-y-5">
          <div className="p-4 bg-rose-50 rounded-xl border border-rose-100 flex items-start gap-3">
            <AlertTriangle size={20} className="text-rose-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-bold text-rose-700">Cảnh báo: Khóa khẩn cấp</p>
              <p className="text-xs text-rose-500 mt-1">
                Hành động này sẽ khóa một phần hoặc toàn bộ hệ thống. Chỉ thực hiện khi thực sự cần thiết.
              </p>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-500 uppercase">Loại khóa</label>
            <div className="grid grid-cols-2 gap-3 mt-2">
              {([
                ['SYSTEM', 'SYSTEM', Server],
                ['DOCUMENT', 'DOCUMENT', FileText],
                ['USER', 'USER', UserX],
                ['DEPARTMENT', 'DEPARTMENT', Building2],
                ['BREACH_DETECTED', 'BREACH', Bug],
              ] as const).map(([value, label, Icon]) => (
                <button
                  key={value}
                  onClick={() => setLockType(value)}
                  className={`p-3 rounded-xl border-2 transition-all flex items-center gap-2 ${
                    lockType === value
                      ? 'border-rose-500 bg-rose-50 text-rose-700'
                      : 'border-slate-200 hover:border-slate-300 text-slate-600'
                  }`}
                >
                  <Icon size={18} />
                  <span className="text-xs font-bold">{label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-500 uppercase">Lý do khóa *</label>
            <textarea
              value={lockReason}
              onChange={(e) => setLockReason(e.target.value)}
              placeholder="Nhập lý do khóa khẩn cấp (VD: Phát hiện xâm nhập từ IP lạ)..."
              className="w-full mt-2 px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500 outline-none text-sm resize-none"
              rows={3}
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-500 uppercase">Tự động mở khóa sau (phút)</label>
            <input
              type="number"
              value={autoUnlockMinutes}
              onChange={(e) => setAutoUnlockMinutes(Number(e.target.value))}
              placeholder="0 = không tự động mở"
              className="w-full mt-2 px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500 outline-none text-sm"
              min={0}
            />
            <p className="text-[10px] text-slate-400 mt-1">Để 0 nếu muốn khóa vô thời hạn cho đến khi bạn bỏ khóa thủ công</p>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={() => setShowActivateModal(false)}
              className="flex-1 py-3 border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50 transition-all"
            >
              Hủy
            </button>
            <button
              onClick={handleActivate}
              disabled={activating || !lockReason.trim()}
              className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 disabled:bg-slate-300 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2"
            >
              <Zap size={18} />
              {activating ? 'Đang kích hoạt...' : 'Kích hoạt khóa'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Anomaly Detail Modal */}
      <Modal isOpen={showAnomalyDetail} onClose={() => setShowAnomalyDetail(false)} title="Chi tiết bất thường" size="lg">
        {anomalyStats?.recent && anomalyStats.recent.length > 0 ? (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {anomalyStats.recent.map((item, idx) => (
              <div key={idx} className={`p-4 rounded-xl border ${
                item.severity === 'CRITICAL' ? 'bg-rose-50 border-rose-200' :
                item.severity === 'HIGH' ? 'bg-amber-50 border-amber-200' :
                'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-xs font-black px-2 py-0.5 rounded ${
                    item.severity === 'CRITICAL' ? 'bg-rose-100 text-rose-600' :
                    item.severity === 'HIGH' ? 'bg-amber-100 text-amber-600' :
                    'bg-slate-100 text-slate-600'
                  }`}>
                    {item.type.replace(/_/g, ' ')}
                  </span>
                  <span className="text-xs text-slate-400">
                    {new Date(item.timestamp).toLocaleString('vi-VN')}
                  </span>
                </div>
                <p className="text-xs font-medium text-slate-700">{item.userName}</p>
                <p className="text-xs text-slate-500 mt-1">{item.details}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-slate-400">
            <Activity size={32} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">Không có bất thường nào gần đây</p>
          </div>
        )}
      </Modal>
    </div>
  );
};
