
import React, { useEffect, useState } from 'react';
import {
  Shield, Plus, Trash2, Eye, Edit2, RefreshCw, Bug, Key,
  FileText, Link2, CreditCard, File, Clock, AlertTriangle,
  Activity, ShieldCheck, X, Search, Zap
} from 'lucide-react';
import { Modal } from '../../components/Admin/Modal';
import { honeytokenApi, Honeytoken } from '../../api';

export const HoneytokenManagement: React.FC = () => {
  const [tokens, setTokens] = useState<Honeytoken[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedToken, setSelectedToken] = useState<Honeytoken | null>(null);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  // Create form
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'DOCUMENT' as Honeytoken['type'],
    expiresInDays: 30,
    autoExpire: true,
    alertChannels: [] as string[],
  });

  const loadTokens = async () => {
    setLoading(true);
    try {
      const data = await honeytokenApi.getAll();
      setTokens(data.honeytokens || []);
    } catch (err) {
      console.error('Error loading honeytokens:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTokens();
  }, []);

  const handleCreate = async () => {
    if (!formData.name.trim()) {
      alert('Vui lòng nhập tên honeytoken!');
      return;
    }
    setCreating(true);
    try {
      await honeytokenApi.create(formData);
      alert('Tạo honeytoken thành công! Token sẽ được ghi nhận nếu bị truy cập.');
      setShowCreateModal(false);
      setFormData({ name: '', description: '', type: 'DOCUMENT', expiresInDays: 30, autoExpire: true, alertChannels: [] });
      loadTokens();
    } catch (err: any) {
      alert('Tạo thất bại: ' + (err.message || 'Lỗi không xác định'));
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa honeytoken này?')) return;
    setDeleting(id);
    try {
      await honeytokenApi.delete(id);
      alert('Đã xóa honeytoken!');
      loadTokens();
    } catch (err: any) {
      alert('Xóa thất bại: ' + (err.message || 'Lỗi không xác định'));
    } finally {
      setDeleting(null);
    }
  };

  const handleUpdate = async () => {
    if (!selectedToken) return;
    setSaving(true);
    try {
      await honeytokenApi.update(selectedToken._id || selectedToken.id, {
        name: selectedToken.name,
        description: selectedToken.description,
        isActive: selectedToken.isActive,
        expiresInDays: formData.expiresInDays,
        autoExpire: formData.autoExpire,
        alertChannels: formData.alertChannels,
      });
      alert('Cập nhật thành công!');
      setShowEditModal(false);
      loadTokens();
    } catch (err: any) {
      alert('Cập nhật thất bại: ' + (err.message || 'Lỗi không xác định'));
    } finally {
      setSaving(false);
    }
  };

  const openEditModal = (token: Honeytoken) => {
    setSelectedToken({ ...token });
    setFormData({
      name: token.name,
      description: token.description,
      type: token.type,
      expiresInDays: 30,
      autoExpire: token.autoExpire,
      alertChannels: token.alertChannels || [],
    });
    setShowEditModal(true);
  };

  const filteredTokens = tokens.filter(t => {
    const matchSearch = t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchType = filterType === 'ALL' || t.type === filterType;
    return matchSearch && matchType;
  });

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'DOCUMENT': return <FileText size={16} />;
      case 'CREDENTIAL': return <Key size={16} />;
      case 'API_KEY': return <CreditCard size={16} />;
      case 'FILE': return <File size={16} />;
      case 'LINK': return <Link2 size={16} />;
      default: return <Bug size={16} />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'DOCUMENT': return 'bg-amber-100 text-amber-600';
      case 'CREDENTIAL': return 'bg-rose-100 text-rose-600';
      case 'API_KEY': return 'bg-sky-100 text-sky-600';
      case 'FILE': return 'bg-purple-100 text-purple-600';
      case 'LINK': return 'bg-emerald-100 text-emerald-600';
      default: return 'bg-slate-100 text-slate-600';
    }
  };

  const triggeredCount = tokens.filter(t => t.triggered).length;
  const activeCount = tokens.filter(t => t.isActive && !t.isExpired).length;

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
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight uppercase italic">Honeytoken</h2>
          <p className="text-slate-500 text-sm font-medium">File bait — phát hiện xâm nhập dữ liệu sớm nhất</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={loadTokens}
            className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
            title="Làm mới"
          >
            <RefreshCw size={20} />
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-emerald-500/20 flex items-center gap-2 transition-all"
          >
            <Plus size={18} /> Tạo honeytoken
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 text-emerald-600 rounded-xl">
              <ShieldCheck size={20} />
            </div>
            <div>
              <p className="text-2xl font-black text-slate-800">{tokens.length}</p>
              <p className="text-xs text-slate-400">Tổng honeytoken</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 text-amber-600 rounded-xl">
              <Bug size={20} />
            </div>
            <div>
              <p className="text-2xl font-black text-slate-800">{activeCount}</p>
              <p className="text-xs text-slate-400">Đang hoạt động</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-rose-100 text-rose-600 rounded-xl">
              <AlertTriangle size={20} />
            </div>
            <div>
              <p className="text-2xl font-black text-slate-800">{triggeredCount}</p>
              <p className="text-xs text-slate-400">Đã bị trigger</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-sky-100 text-sky-600 rounded-xl">
              <Activity size={20} />
            </div>
            <div>
              <p className="text-2xl font-black text-slate-800">
                {tokens.reduce((sum, t) => sum + (t.triggerCount || 0), 0)}
              </p>
              <p className="text-xs text-slate-400">Tổng lượt trigger</p>
            </div>
          </div>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl border border-amber-200 p-5 flex items-start gap-4">
        <div className="p-3 bg-amber-100 text-amber-600 rounded-xl flex-shrink-0">
          <Bug size={24} />
        </div>
        <div>
          <h4 className="font-black text-amber-800 text-sm">Honeytoken là gì?</h4>
          <p className="text-xs text-amber-700 mt-1">
            Honeytoken là file/tài liệu giả được tạo ra để đặt trong hệ thống. Khi ai đó cố truy cập, hệ thống sẽ tự động cảnh báo — cho biết có người đang cố đánh cắp dữ liệu. Sử dụng honeytoken kết hợp với Forensic Watermarking giúp phát hiện và truy vết kẻ xâm nhập cực kỳ hiệu quả.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Tìm honeytoken..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl py-3 pl-12 pr-4 focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
          />
        </div>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="bg-white border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
        >
          <option value="ALL">Tất cả loại</option>
          <option value="DOCUMENT">Document</option>
          <option value="CREDENTIAL">Credential</option>
          <option value="API_KEY">API Key</option>
          <option value="FILE">File</option>
          <option value="LINK">Link</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 text-[10px] font-black uppercase tracking-widest">
            <tr>
              <th className="px-8 py-5">Honeytoken</th>
              <th className="px-8 py-5">Loại</th>
              <th className="px-8 py-5">Trạng thái</th>
              <th className="px-8 py-5">Trigger</th>
              <th className="px-8 py-5">Hết hạn</th>
              <th className="px-8 py-5">Ngày tạo</th>
              <th className="px-8 py-5 text-right">Hành động</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filteredTokens.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-8 py-16 text-center text-slate-400">
                  <Bug size={32} className="mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Không tìm thấy honeytoken nào</p>
                </td>
              </tr>
            ) : (
              filteredTokens.map(token => (
                <tr key={token._id || token.id} className="hover:bg-emerald-50/20 transition-colors group">
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-slate-100 text-slate-400 group-hover:bg-emerald-100 group-hover:text-emerald-600 rounded-xl transition-all">
                        {token.triggered ? <Bug size={18} className="text-rose-500" /> : <Shield size={18} />}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-700">{token.name}</p>
                        <p className="text-[10px] text-slate-400 line-clamp-1">{token.description}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <span className={`text-[10px] font-black px-2 py-1 rounded-full uppercase flex items-center gap-1 ${getTypeColor(token.type)}`}>
                      {getTypeIcon(token.type)}
                      {token.type.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-8 py-5">
                    {token.isExpired ? (
                      <span className="text-[10px] font-black px-2 py-1 rounded-full bg-slate-100 text-slate-400">
                        Hết hạn
                      </span>
                    ) : token.triggered ? (
                      <span className="text-[10px] font-black px-2 py-1 rounded-full bg-rose-100 text-rose-600 flex items-center gap-1">
                        <Zap size={10} /> Bị trigger!
                      </span>
                    ) : token.isActive ? (
                      <span className="text-[10px] font-black px-2 py-1 rounded-full bg-emerald-100 text-emerald-600">
                        Hoạt động
                      </span>
                    ) : (
                      <span className="text-[10px] font-black px-2 py-1 rounded-full bg-slate-100 text-slate-400">
                        Tắt
                      </span>
                    )}
                  </td>
                  <td className="px-8 py-5">
                    <span className={`text-sm font-black ${token.triggerCount > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                      {token.triggerCount || 0}
                    </span>
                  </td>
                  <td className="px-8 py-5">
                    <span className="text-xs text-slate-500">
                      {token.expiresAt
                        ? new Date(token.expiresAt).toLocaleDateString('vi-VN')
                        : 'Không có'}
                    </span>
                  </td>
                  <td className="px-8 py-5">
                    <span className="text-xs text-slate-500">
                      {new Date(token.createdAt).toLocaleDateString('vi-VN')}
                    </span>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => { setSelectedToken(token); setShowDetailModal(true); }}
                        className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
                        title="Chi tiết & Access Logs"
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        onClick={() => openEditModal(token)}
                        className="p-2 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-xl transition-all"
                        title="Chỉnh sửa"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(token._id || token.id)}
                        disabled={deleting === (token._id || token.id)}
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                        title="Xóa"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create Modal */}
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Tạo honeytoken mới" size="lg">
        <div className="space-y-4">
          <div className="p-4 bg-amber-50 rounded-xl border border-amber-100 flex items-start gap-3">
            <Bug size={18} className="text-amber-500 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-amber-700">
              Honeytoken là file/tài liệu giả. Khi bị truy cập, hệ thống sẽ cảnh báo ngay lập tức qua email, webhook và audit log.
            </p>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-500 uppercase">Tên honeytoken *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="VD: Báo cáo tài chính Q4 2025 (bản gốc)"
              className="w-full mt-1 px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-500 uppercase">Mô tả</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Mô tả honeytoken để dễ nhận biết..."
              className="w-full mt-1 px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm resize-none"
              rows={2}
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-500 uppercase">Loại</label>
            <div className="grid grid-cols-5 gap-2 mt-2">
              {(['DOCUMENT', 'CREDENTIAL', 'API_KEY', 'FILE', 'LINK'] as const).map(type => (
                <button
                  key={type}
                  onClick={() => setFormData({ ...formData, type })}
                  className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center gap-1 ${
                    formData.type === type ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {getTypeIcon(type)}
                  <span className="text-[10px] font-bold">{type === 'API_KEY' ? 'API' : type}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">Hết hạn sau (ngày)</label>
              <input
                type="number"
                value={formData.expiresInDays}
                onChange={(e) => setFormData({ ...formData, expiresInDays: Number(e.target.value) })}
                className="w-full mt-1 px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                min={1}
              />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.autoExpire}
                  onChange={(e) => setFormData({ ...formData, autoExpire: e.target.checked })}
                  className="w-4 h-4 rounded accent-emerald-600"
                />
                <span className="text-xs font-bold text-slate-600">Tự động hết hạn</span>
              </label>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={() => setShowCreateModal(false)}
              className="flex-1 py-3 border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50 transition-all"
            >
              Hủy
            </button>
            <button
              onClick={handleCreate}
              disabled={creating || !formData.name.trim()}
              className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2"
            >
              <Plus size={18} />
              {creating ? 'Đang tạo...' : 'Tạo honeytoken'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Detail Modal */}
      <Modal isOpen={showDetailModal} onClose={() => setShowDetailModal(false)} title="Chi tiết honeytoken" size="lg">
        {selectedToken && (
          <div className="space-y-5">
            <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-xl">
              <div className={`p-3 rounded-xl ${selectedToken.triggered ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'}`}>
                {selectedToken.triggered ? <Bug size={24} /> : <Shield size={24} />}
              </div>
              <div className="flex-1">
                <h4 className="font-black text-slate-800 text-lg">{selectedToken.name}</h4>
                <p className="text-sm text-slate-500 mt-1">{selectedToken.description}</p>
                <div className="flex items-center gap-3 mt-3">
                  <span className={`text-xs font-black px-2 py-1 rounded-full ${getTypeColor(selectedToken.type)}`}>
                    {getTypeIcon(selectedToken.type)} {selectedToken.type}
                  </span>
                  <span className={`text-xs font-black px-2 py-1 rounded-full ${
                    selectedToken.triggered ? 'bg-rose-100 text-rose-600' :
                    selectedToken.isActive ? 'bg-emerald-100 text-emerald-600' :
                    'bg-slate-100 text-slate-400'
                  }`}>
                    {selectedToken.triggered ? 'Đã bị trigger' :
                     selectedToken.isActive ? 'Hoạt động' : 'Tắt'}
                  </span>
                </div>
              </div>
            </div>

            {/* Access Logs */}
            <div>
              <h5 className="text-xs font-black text-slate-500 uppercase mb-3 flex items-center gap-2">
                <Activity size={14} /> Nhật ký truy cập ({selectedToken.accessLogs?.length || 0})
              </h5>
              {selectedToken.accessLogs && selectedToken.accessLogs.length > 0 ? (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {selectedToken.accessLogs.map((log, idx) => (
                    <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-700">{log.userName || 'Unknown'}</span>
                          <span className="text-xs text-slate-400">•</span>
                          <span className="text-xs text-slate-500">{log.ipAddress}</span>
                        </div>
                        <span className="text-[10px] text-slate-400">
                          {new Date(log.timestamp).toLocaleString('vi-VN')}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1 font-mono truncate">{log.userAgent}</p>
                      {log.details && <p className="text-[10px] text-rose-500 mt-1">Action: {log.action} — {log.details}</p>}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-slate-400 bg-slate-50 rounded-xl">
                  <Shield size={24} className="mx-auto mb-1 opacity-30" />
                  <p className="text-xs">Chưa có ai truy cập honeytoken này</p>
                </div>
              )}
            </div>

            {/* Metadata */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl">
                <p className="text-slate-400 uppercase font-black text-[10px]">Token</p>
                <p className="font-mono text-slate-600 truncate mt-1" title={selectedToken.token}>{selectedToken.token}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <p className="text-slate-400 uppercase font-black text-[10px]">Tạo bởi</p>
                <p className="font-bold text-slate-600 mt-1">{selectedToken.createdByName || selectedToken.createdBy}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <p className="text-slate-400 uppercase font-black text-[10px]">Ngày tạo</p>
                <p className="font-bold text-slate-600 mt-1">{new Date(selectedToken.createdAt).toLocaleString('vi-VN')}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <p className="text-slate-400 uppercase font-black text-[10px]">Hết hạn</p>
                <p className="font-bold text-slate-600 mt-1">
                  {selectedToken.expiresAt ? new Date(selectedToken.expiresAt).toLocaleString('vi-VN') : 'Không có'}
                </p>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Chỉnh sửa honeytoken" size="lg">
        {selectedToken && (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">Tên</label>
              <input
                type="text"
                value={selectedToken.name}
                onChange={(e) => setSelectedToken({ ...selectedToken, name: e.target.value })}
                className="w-full mt-1 px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">Mô tả</label>
              <textarea
                value={selectedToken.description}
                onChange={(e) => setSelectedToken({ ...selectedToken, description: e.target.value })}
                className="w-full mt-1 px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm resize-none"
                rows={2}
              />
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
              <span className="text-xs font-bold text-slate-600">Kích hoạt</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedToken.isActive}
                  onChange={(e) => setSelectedToken({ ...selectedToken, isActive: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:ring-2 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowEditModal(false)}
                className="flex-1 py-3 border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50 transition-all"
              >
                Hủy
              </button>
              <button
                onClick={handleUpdate}
                disabled={saving}
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white rounded-xl font-bold transition-all"
              >
                {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
