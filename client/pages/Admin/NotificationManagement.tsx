import React, { useEffect, useState } from 'react';
import { Bell, Send, Users, AlertTriangle, CheckCircle, Info, X, Trash2, RefreshCw, Search, Filter } from 'lucide-react';
import { notificationsApi, usersApi } from '../../api';
import { Notification, User } from '../../types';
import { Modal } from '../../components/Admin/Modal';

export const NotificationManagement: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBroadcastModalOpen, setIsBroadcastModalOpen] = useState(false);
  const [filterType, setFilterType] = useState<string>('ALL');
  const [filterReadStatus, setFilterReadStatus] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    userId: '',
    title: '',
    message: '',
    type: 'INFO',
    priority: 'NORMAL',
    link: ''
  });
  const [broadcastData, setBroadcastData] = useState({
    userIds: [] as string[],
    title: '',
    message: '',
    type: 'INFO',
    priority: 'NORMAL',
    link: '',
    sendToAll: false
  });

  const fetchData = async () => {
    try {
      const [notifData, usersData] = await Promise.all([
        notificationsApi.getAllAdmin(),
        usersApi.getAll()
      ]);
      setNotifications(notifData || []);
      setUsers(usersData || []);
    } catch (err) {
      console.error('Fetch notification data error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleSendNotification = async () => {
    if (!formData.userId || !formData.title || !formData.message) {
      alert('Vui lòng điền đầy đủ thông tin!');
      return;
    }
    try {
      await notificationsApi.create(formData);
      alert('Gửi thông báo thành công!');
      setIsModalOpen(false);
      setFormData({ userId: '', title: '', message: '', type: 'INFO', priority: 'NORMAL', link: '' });
      fetchData();
    } catch (err) {
      console.error('Send notification error:', err);
      alert('Gửi thông báo thất bại!');
    }
  };

  const handleBroadcast = async () => {
    if (!broadcastData.sendToAll && broadcastData.userIds.length === 0) {
      alert('Vui lòng chọn ít nhất một người dùng hoặc chọn gửi cho tất cả!');
      return;
    }
    if (!broadcastData.title || !broadcastData.message) {
      alert('Vui lòng nhập tiêu đề và nội dung!');
      return;
    }
    try {
      const result = await notificationsApi.broadcast(broadcastData);
      alert(result.message);
      setIsBroadcastModalOpen(false);
      setBroadcastData({ userIds: [], title: '', message: '', type: 'INFO', priority: 'NORMAL', link: '', sendToAll: false });
      fetchData();
    } catch (err) {
      console.error('Broadcast error:', err);
      alert('Gửi thông báo thất bại!');
    }
  };

  const handleDeleteNotification = async (id: string) => {
    if (!confirm('Bạn có chắc muốn xóa thông báo này?')) return;
    try {
      await notificationsApi.delete(id);
      alert('Xóa thông báo thành công!');
      fetchData();
    } catch (err) {
      console.error('Delete notification error:', err);
      alert('Xóa thông báo thất bại!');
    }
  };

  const toggleUserSelection = (userId: string) => {
    setBroadcastData(prev => ({
      ...prev,
      userIds: prev.userIds.includes(userId)
        ? prev.userIds.filter(id => id !== userId)
        : [...prev.userIds, userId]
    }));
  };

  const selectAllUsers = () => {
    setBroadcastData(prev => ({
      ...prev,
      userIds: prev.userIds.length === users.length ? [] : users.map(u => u.id)
    }));
  };

  const filteredNotifications = notifications.filter(notif => {
    const matchesType = filterType === 'ALL' || notif.type === filterType;
    const isRead = (notif as any).isRead ?? (notif as any).read ?? false;
    const matchesReadStatus =
      filterReadStatus === 'ALL' ||
      (filterReadStatus === 'READ' && isRead) ||
      (filterReadStatus === 'UNREAD' && !isRead);
    const matchesSearch = searchTerm === '' ||
      notif.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      notif.message?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ((notif as any).userId?.name || '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchesType && matchesReadStatus && matchesSearch;
  });

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'WARNING': return <AlertTriangle size={16} className="text-amber-500" />;
      case 'ALERT': return <AlertTriangle size={16} className="text-red-500" />;
      case 'SUCCESS': return <CheckCircle size={16} className="text-emerald-500" />;
      default: return <Info size={16} className="text-blue-500" />;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'WARNING': return 'bg-amber-500/10 text-amber-600 border-amber-200';
      case 'ALERT': return 'bg-red-500/10 text-red-600 border-red-200';
      case 'SUCCESS': return 'bg-emerald-500/10 text-emerald-600 border-emerald-200';
      default: return 'bg-blue-500/10 text-blue-600 border-blue-200';
    }
  };

  const getPriorityBadge = (priority?: string) => {
    switch (priority) {
      case 'HIGH': return 'bg-red-100 text-red-700';
      case 'LOW': return 'bg-slate-100 text-slate-600';
      default: return 'bg-blue-100 text-blue-700';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight uppercase italic">Quản lý thông báo</h2>
          <p className="text-slate-500 text-sm">Gửi thông báo và cập nhật cho nhân sự</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50"
          >
            <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} /> Làm mới
          </button>
          <button
            onClick={() => setIsBroadcastModalOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition-all active:scale-95"
          >
            <Users size={18} /> Gửi nhiều người
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-blue-500/20 transition-all active:scale-95"
          >
            <Send size={18} /> Gửi một người
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 text-blue-600 rounded-xl">
              <Bell size={20} />
            </div>
            <div>
              <p className="text-2xl font-black text-slate-800">{notifications.length}</p>
              <p className="text-xs text-slate-500 font-medium">Tổng thông báo</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-100 text-amber-600 rounded-xl">
              <AlertTriangle size={20} />
            </div>
            <div>
              <p className="text-2xl font-black text-slate-800">
                {notifications.filter(n => n.type === 'WARNING').length}
              </p>
              <p className="text-xs text-slate-500 font-medium">Cảnh báo</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-red-100 text-red-600 rounded-xl">
              <AlertTriangle size={20} />
            </div>
            <div>
              <p className="text-2xl font-black text-slate-800">
                {notifications.filter(n => n.type === 'ALERT').length}
              </p>
              <p className="text-xs text-slate-500 font-medium">Thông báo khẩn</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-100 text-emerald-600 rounded-xl">
              <Users size={20} />
            </div>
            <div>
              <p className="text-2xl font-black text-slate-800">{users.length}</p>
              <p className="text-xs text-slate-500 font-medium">Người dùng</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter & Search */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm kiếm thông báo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-slate-400" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white text-sm"
            >
              <option value="ALL">Tất cả loại</option>
              <option value="INFO">Thông tin</option>
              <option value="WARNING">Cảnh báo</option>
              <option value="ALERT">Khẩn cấp</option>
              <option value="SUCCESS">Thành công</option>
            </select>
            <select
              value={filterReadStatus}
              onChange={(e) => setFilterReadStatus(e.target.value)}
              className="px-3 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white text-sm"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="UNREAD">Chưa đọc</option>
              <option value="READ">Đã đọc</option>
            </select>
          </div>
        </div>
      </div>

      {/* Notification List */}
      <div className="bg-white rounded-[32px] shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <h3 className="font-bold text-slate-800">
            Lịch sử thông báo đã gửi
            <span className="ml-2 text-sm font-normal text-slate-400">
              ({filteredNotifications.length} / {notifications.length})
            </span>
          </h3>
        </div>
        <div className="divide-y divide-slate-50">
          {loading ? (
            <div className="p-8 text-center text-slate-400">Đang tải...</div>
          ) : filteredNotifications.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              {searchTerm || filterType !== 'ALL' ? 'Không tìm thấy thông báo nào' : 'Chưa có thông báo nào'}
            </div>
          ) : (
            filteredNotifications.map((notif) => (
              <div key={notif.id} className="p-6 hover:bg-slate-50 transition-colors group">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1">
                    <div className={`p-2 rounded-xl ${getTypeBadge(notif.type)}`}>
                      {getTypeIcon(notif.type)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-bold text-slate-800">{notif.title}</h4>
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase ${getTypeBadge(notif.type)}`}>
                          {notif.type}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${getPriorityBadge(notif.priority)}`}>
                          {notif.priority === 'HIGH' ? 'Cao' : notif.priority === 'LOW' ? 'Thấp' : 'Bình thường'}
                        </span>
                      </div>
                      <p className="text-sm text-slate-500 mt-1">{notif.message}</p>
                      <div className="flex items-center gap-4 mt-2">
                        <span className="text-xs text-slate-400">
                          Gửi đến: <span className="font-medium">{(notif as any).userId?.name || (notif as any).userId?.email || notif.userId || 'Nhiều người'}</span>
                        </span>
                        <span className="text-xs text-slate-400">
                          {new Date(notif.createdAt).toLocaleString('vi-VN')}
                        </span>
                        {(((notif as any).isRead ?? (notif as any).read) === false) && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 uppercase">
                            Chưa đọc
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteNotification(notif._id || notif.id)}
                    className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                    title="Xóa thông báo"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Single User Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Gửi thông báo cho một người">
        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase">Người nhận</label>
            <select
              value={formData.userId}
              onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
              className="w-full mt-1 px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="">Chọn người dùng</option>
              {users.map(user => (
                <option key={user.id} value={user.id}>{user.name} ({user.email})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase">Tiêu đề</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full mt-1 px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="Tiêu đề thông báo"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase">Nội dung</label>
            <textarea
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              className="w-full mt-1 px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none resize-none"
              rows={3}
              placeholder="Nội dung thông báo..."
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase">Đường dẫn (Tùy chọn)</label>
            <input
              type="text"
              value={formData.link}
              onChange={(e) => setFormData({ ...formData, link: e.target.value })}
              className="w-full mt-1 px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="VD: /messages, /dashboard"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">Loại</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full mt-1 px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="INFO">Thông tin</option>
                <option value="WARNING">Cảnh báo</option>
                <option value="ALERT">Khẩn cấp</option>
                <option value="SUCCESS">Thành công</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">Ưu tiên</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                className="w-full mt-1 px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="LOW">Thấp</option>
                <option value="NORMAL">Bình thường</option>
                <option value="HIGH">Cao</option>
              </select>
            </div>
          </div>
          <button
            onClick={handleSendNotification}
            disabled={!formData.userId || !formData.title || !formData.message}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2"
          >
            <Send size={18} /> Gửi thông báo
          </button>
        </div>
      </Modal>

      {/* Broadcast Modal */}
      <Modal isOpen={isBroadcastModalOpen} onClose={() => setIsBroadcastModalOpen(false)} title="Gửi thông báo cho nhiều người" size="lg">
        <div className="space-y-4">
          {/* Send to all option */}
          <div className="bg-gradient-to-r from-emerald-50 to-blue-50 p-4 rounded-xl border border-emerald-200">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={broadcastData.sendToAll}
                onChange={(e) => setBroadcastData({
                  ...broadcastData,
                  sendToAll: e.target.checked,
                  userIds: e.target.checked ? [] : broadcastData.userIds
                })}
                className="w-5 h-5 text-emerald-600 rounded focus:ring-emerald-500"
              />
              <div>
                <span className="font-bold text-slate-800">Gửi cho tất cả mọi người</span>
                <p className="text-xs text-slate-500">Thông báo sẽ được gửi đến tất cả người dùng đang hoạt động</p>
              </div>
            </label>
          </div>

          {!broadcastData.sendToAll && (
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">Người nhận ({broadcastData.userIds.length} đã chọn)</label>
              <div className="mt-2 flex gap-2 mb-2">
                <button
                  onClick={selectAllUsers}
                  className="text-xs text-blue-600 hover:underline"
                >
                  {broadcastData.userIds.length === users.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                </button>
              </div>
              <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-xl p-2">
                {users.map(user => (
                  <label
                    key={user.id}
                    className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer hover:bg-slate-50 ${
                      broadcastData.userIds.includes(user.id) ? 'bg-blue-50' : ''
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={broadcastData.userIds.includes(user.id)}
                      onChange={() => toggleUserSelection(user.id)}
                      className="sr-only"
                    />
                    <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                      broadcastData.userIds.includes(user.id) ? 'bg-blue-500 border-blue-500' : 'border-slate-300'
                    }`}>
                      {broadcastData.userIds.includes(user.id) && <CheckCircle size={12} className="text-white" />}
                    </div>
                    <span className="text-sm">{user.name}</span>
                    <span className="text-xs text-slate-400">({user.email})</span>
                  </label>
                ))}
              </div>
            </div>
          )}
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase">Tiêu đề</label>
            <input
              type="text"
              value={broadcastData.title}
              onChange={(e) => setBroadcastData({ ...broadcastData, title: e.target.value })}
              className="w-full mt-1 px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="Tiêu đề thông báo"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase">Nội dung</label>
            <textarea
              value={broadcastData.message}
              onChange={(e) => setBroadcastData({ ...broadcastData, message: e.target.value })}
              className="w-full mt-1 px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none resize-none"
              rows={3}
              placeholder="Nội dung thông báo..."
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase">Đường dẫn (Tùy chọn)</label>
            <input
              type="text"
              value={broadcastData.link}
              onChange={(e) => setBroadcastData({ ...broadcastData, link: e.target.value })}
              className="w-full mt-1 px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="VD: /messages, /dashboard"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">Loại</label>
              <select
                value={broadcastData.type}
                onChange={(e) => setBroadcastData({ ...broadcastData, type: e.target.value })}
                className="w-full mt-1 px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="INFO">Thông tin</option>
                <option value="WARNING">Cảnh báo</option>
                <option value="ALERT">Khẩn cấp</option>
                <option value="SUCCESS">Thành công</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">Ưu tiên</label>
              <select
                value={broadcastData.priority}
                onChange={(e) => setBroadcastData({ ...broadcastData, priority: e.target.value })}
                className="w-full mt-1 px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="LOW">Thấp</option>
                <option value="NORMAL">Bình thường</option>
                <option value="HIGH">Cao</option>
              </select>
            </div>
          </div>
          <button
            onClick={handleBroadcast}
            disabled={(!broadcastData.sendToAll && broadcastData.userIds.length === 0) || !broadcastData.title || !broadcastData.message}
            className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2"
          >
            <Users size={18} /> {broadcastData.sendToAll ? `Gửi cho tất cả (${users.length} người)` : `Gửi cho ${broadcastData.userIds.length} người`}
          </button>
        </div>
      </Modal>
    </div>
  );
};

