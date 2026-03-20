import React, { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { chatManagementApi, usersApi } from '../../api';
import { usePermission } from '../../hooks/usePermission';
import { Search, MessageSquare, Users, Lock, Unlock, Trash2, Send, Download, Settings, Filter, Eye, X, Plus, Minus, MessageCircle, Mail } from 'lucide-react';
import { Modal } from '../../components/Admin/Modal';
import { useAuth } from '../../context/AuthContext';

interface ChatRoom {
  id: string;
  name: string;
  description: string;
  type: string;
  isLocked: boolean;
  memberCount: number;
  messageCount: number;
  createdAt: string;
}

interface Message {
  id: string;
  userId: string;
  userName: string;
  text: string;
  room: string;
  createdAt: string;
  isDeleted: boolean;
}

interface ChatStats {
  totalRooms: number;
  totalMessages: number;
  activeRooms: number;
  lockedRooms: number;
  messagesToday: number;
  messagesThisWeek: number;
}

export const ChatManagement: React.FC = () => {
  const { hasPermission, isSuperAdmin, isAdmin } = usePermission();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'rooms' | 'messages' | 'policy' | 'adminchat'>('rooms');
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [stats, setStats] = useState<ChatStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null);
  const [policy, setPolicy] = useState<any>(null);

  // Modals
  const [isRoomDetailOpen, setIsRoomDetailOpen] = useState(false);
  const [isMessageDetailOpen, setIsMessageDetailOpen] = useState(false);
  const [isPolicyOpen, setIsPolicyOpen] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [deleteReason, setDeleteReason] = useState('');

  // Filters
  const [filterType, setFilterType] = useState<string>('ALL');
  const [filterLocked, setFilterLocked] = useState<string>('ALL');

  // User list for adding members
  const [users, setUsers] = useState<any[]>([]);

  // Admin Chat state
  const [adminChatMessages, setAdminChatMessages] = useState<any[]>([]);
  const [adminChatInput, setAdminChatInput] = useState('');
  const [selectedChatUser, setSelectedChatUser] = useState<any>(null);
  const [adminChatSearch, setAdminChatSearch] = useState('');
  const [adminChatLoading, setAdminChatLoading] = useState(false);
  const adminChatScrollRef = useRef<HTMLDivElement>(null);
  const [adminConversationId, setAdminConversationId] = useState<string | null>(null);
  const [adminSocket, setAdminSocket] = useState<Socket | null>(null);
  const [pendingChatNotification, setPendingChatNotification] = useState<Record<string, any>>({});

  // Toast notification state
  const [toasts, setToasts] = useState<any[]>([]);

  // Add toast notification
  const addToast = (title: string, message: string, role?: string) => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, title, message, role }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  };

  // Filter users for admin chat
  const filteredChatUsers = users.filter(u =>
    u.name?.toLowerCase().includes(adminChatSearch.toLowerCase()) ||
    u.email?.toLowerCase().includes(adminChatSearch.toLowerCase())
  );

  // Fetch admin chat messages with selected user
  const fetchAdminChatMessages = async (userId: string) => {
    setAdminChatLoading(true);
    try {
      const res = await chatManagementApi.getAdminChatMessages(userId);
      setAdminChatMessages(res.messages || []);
      setAdminConversationId(res.conversationId || null);
      setTimeout(() => {
        adminChatScrollRef.current?.scrollTo({ top: adminChatScrollRef.current.scrollHeight, behavior: 'smooth' });
      }, 100);
    } catch (error) {
      console.error('Error fetching admin chat messages:', error);
    } finally {
      setAdminChatLoading(false);
    }
  };

  // Send admin chat message
  const handleSendAdminChat = async () => {
    if (!adminChatInput.trim() || !selectedChatUser) return;
    const inputText = adminChatInput.trim();
    setAdminChatInput('');
    try {
      const res = await chatManagementApi.sendAdminChatMessage(selectedChatUser.id, inputText);
      if (res && res.id) {
        setAdminChatMessages(prev => {
          // Prevent duplicates
          if (prev.find(m => m.id === res.id)) return prev;
          return [...prev, res];
        });
        setTimeout(() => {
          adminChatScrollRef.current?.scrollTo({ top: adminChatScrollRef.current.scrollHeight, behavior: 'smooth' });
        }, 50);
      }
    } catch (error) {
      console.error('Error sending admin chat message:', error);
      alert('Không thể gửi tin nhắn');
      setAdminChatInput(inputText); // Restore input on error
    }
  };

  // Connect socket for real-time admin chat
  useEffect(() => {
    if (!user) return;
    const socket = io('', {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      auth: { userId: user.id, userName: user.name },
      query: { userId: user.id, userName: user.name }
    });
    setAdminSocket(socket);

    socket.on('receive_message', (message: any) => {
      if (message.room === adminConversationId) {
        setAdminChatMessages(prev => {
          // Prevent duplicates
          if (prev.find(m => m.id === message.id)) return prev;
          return [...prev, message];
        });
        setTimeout(() => {
          adminChatScrollRef.current?.scrollTo({ top: adminChatScrollRef.current.scrollHeight, behavior: 'smooth' });
        }, 50);
      }
    });

    // Listen for new DM message notifications from staff/manager
    socket.on('new_admin_message_notification', (data: any) => {
      if (user?.role === 'ADMIN' || user?.role === 'MANAGER') {
        // Add notification badge
        setPendingChatNotification((prev: any) => ({
          ...prev,
          [data.fromUserId]: {
            fromUserName: data.fromUserName,
            fromUserRole: data.fromUserRole,
            preview: data.preview,
            conversationId: data.conversationId,
            messageId: data.messageId
          }
        }));
        // Show toast notification - Manager sent message to Admin
        const roleLabel = data.fromUserRole === 'MANAGER' ? 'Quản lý' : 'Nhân viên';
        addToast(
          `${roleLabel} ${data.fromUserName} đã gửi tin nhắn`,
          data.preview || 'Nhấn để xem'
        );
        // Also refresh messages if we're viewing this user's chat
        if (data.fromUserId === selectedChatUser?.id) {
          fetchAdminChatMessages(data.fromUserId);
        }
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [user, adminConversationId, selectedChatUser]);

  // Join conversation room when conversation ID changes
  useEffect(() => {
    if (adminSocket && adminConversationId) {
      adminSocket.emit('join_room', adminConversationId);
    }
  }, [adminSocket, adminConversationId]);

  useEffect(() => {
    fetchData();
    fetchUsers();
  }, []);

  const fetchData = async () => {
    try {
      const [roomsRes, statsRes] = await Promise.all([
        chatManagementApi.getRooms({ limit: 100 }),
        hasPermission('CHAT_VIEW') ? chatManagementApi.getStats() : Promise.resolve(null)
      ]);
      setRooms(roomsRes.rooms || []);
      setStats(statsRes);
    } catch (error) {
      console.error('Error fetching chat data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const usersRes = await usersApi.getAll();
      // Deduplicate by user ID
      const seen = new Map();
      (usersRes || []).forEach((u: any) => {
        if (!seen.has(u.id)) {
          seen.set(u.id, u);
        }
      });
      setUsers(Array.from(seen.values()));
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchRoomMessages = async (roomId: string) => {
    try {
      const res = await chatManagementApi.getRoomMessages(roomId, { limit: 100 });
      setMessages(res.messages || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const handleSearchMessages = async () => {
    try {
      const res = await chatManagementApi.searchMessages({
        keyword: searchTerm,
        page: 1,
        limit: 100
      });
      setMessages(res.messages || []);
    } catch (error) {
      console.error('Error searching messages:', error);
    }
  };

  const handleDeleteMessage = async () => {
    if (!selectedMessage) return;
    try {
      await chatManagementApi.deleteMessage(selectedMessage.id, deleteReason);
      alert('Message deleted successfully');
      setIsMessageDetailOpen(false);
      setDeleteReason('');
      if (selectedRoom) {
        fetchRoomMessages(selectedRoom.id);
      }
    } catch (error) {
      console.error('Error deleting message:', error);
      alert('Failed to delete message');
    }
  };

  const handleLockRoom = async (room: ChatRoom) => {
    if (!confirm(`Are you sure you want to ${room.isLocked ? 'unlock' : 'lock'} this room?`)) return;
    try {
      await chatManagementApi.lockRoom(room.id, !room.isLocked, 'Admin action');
      fetchData();
      setIsRoomDetailOpen(false);
    } catch (error) {
      console.error('Error locking room:', error);
    }
  };

  const handleSendSystemMessage = async (roomId: string, text: string) => {
    if (!text.trim()) return;
    try {
      await chatManagementApi.sendSystemMessage(roomId, text);
      alert('System message sent');
      fetchRoomMessages(roomId);
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleExportLogs = async (format: 'json' | 'csv') => {
    try {
      const result = await chatManagementApi.exportLogs({ format });
      if (format === 'csv' && result instanceof Blob) {
        const url = window.URL.createObjectURL(result);
        const a = document.createElement('a');
        a.href = url;
        a.download = `chat_logs_${Date.now()}.csv`;
        a.click();
      } else {
        alert('Export completed');
      }
    } catch (error) {
      console.error('Error exporting:', error);
    }
  };

  const handleSavePolicy = async () => {
    try {
      await chatManagementApi.updatePolicy(policy);
      alert('Policy saved successfully');
      setIsPolicyOpen(false);
    } catch (error) {
      console.error('Error saving policy:', error);
    }
  };

  const fetchPolicy = async () => {
    try {
      const res = await chatManagementApi.getPolicy();
      setPolicy(res);
    } catch (error) {
      console.error('Error fetching policy:', error);
    }
  };

  useEffect(() => {
    if (activeTab === 'policy') {
      fetchPolicy();
    }
  }, [activeTab]);

  const filteredRooms = rooms.filter(room => {
    const matchSearch = room.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchType = filterType === 'ALL' || room.type === filterType;
    const matchLocked = filterLocked === 'ALL' ||
      (filterLocked === 'LOCKED' && room.isLocked) ||
      (filterLocked === 'ACTIVE' && !room.isLocked);
    return matchSearch && matchType && matchLocked;
  });

  if (!hasPermission('CHAT_VIEW')) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-slate-500">You don't have permission to view chat management</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight uppercase italic">
            Quan ly Chat noi bo
          </h2>
          <p className="text-slate-500 text-sm font-medium">
            Giam sat va quan ly he thong chat nội bộ
          </p>
        </div>
        <div className="flex gap-3">
          {(isSuperAdmin || isAdmin) && (
            <button
              onClick={() => setIsPolicyOpen(true)}
              className="bg-white border border-slate-200 px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-slate-50"
            >
              <Settings size={18} /> Cau hinh
            </button>
          )}
          <button
            onClick={() => handleExportLogs('csv')}
            className="bg-emerald-600 text-white px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-emerald-700"
          >
            <Download size={18} /> Xuat log
          </button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-100">
            <p className="text-xs font-bold text-slate-400 uppercase">Tong phong</p>
            <p className="text-2xl font-black text-blue-600">{stats.totalRooms}</p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-100">
            <p className="text-xs font-bold text-slate-400 uppercase">Tong tin nhan</p>
            <p className="text-2xl font-black text-green-600">{stats.totalMessages}</p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-100">
            <p className="text-xs font-bold text-slate-400 uppercase">Hoat dong</p>
            <p className="text-2xl font-black text-emerald-600">{stats.activeRooms}</p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-100">
            <p className="text-xs font-bold text-slate-400 uppercase">Bi khoa</p>
            <p className="text-2xl font-black text-rose-600">{stats.lockedRooms}</p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-100">
            <p className="text-xs font-bold text-slate-400 uppercase">Hom nay</p>
            <p className="text-2xl font-black text-amber-600">{stats.messagesToday}</p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-100">
            <p className="text-xs font-bold text-slate-400 uppercase">Tuan nay</p>
            <p className="text-2xl font-black text-purple-600">{stats.messagesThisWeek}</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('rooms')}
          className={`px-4 py-2 font-bold text-sm border-b-2 transition-colors ${
            activeTab === 'rooms'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <MessageSquare size={16} className="inline mr-2" />
          Danh sach phong
        </button>
        <button
          onClick={() => setActiveTab('messages')}
          className={`px-4 py-2 font-bold text-sm border-b-2 transition-colors ${
            activeTab === 'messages'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Search size={16} className="inline mr-2" />
          Tim tin nhan
        </button>
        {(isSuperAdmin || isAdmin) && (
          <>
            <button
              onClick={() => setActiveTab('policy')}
              className={`px-4 py-2 font-bold text-sm border-b-2 transition-colors ${
                activeTab === 'policy'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <Settings size={16} className="inline mr-2" />
              Cau hinh
            </button>
            <button
              onClick={() => {
                setActiveTab('adminchat');
                // Clear all notifications when opening tab
                setPendingChatNotification({});
              }}
              className={`px-4 py-2 font-bold text-sm border-b-2 transition-colors ${
                activeTab === 'adminchat'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <MessageCircle size={16} className="inline mr-2" />
              Nhan tin Admin
              {Object.keys(pendingChatNotification).length > 0 && (
                <span className="ml-1.5 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {Object.keys(pendingChatNotification).length}
                </span>
              )}
            </button>
          </>
        )}
      </div>

      {/* Rooms Tab */}
      {activeTab === 'rooms' && (
        <>
          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                placeholder="Tim phong chat..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl"
              />
            </div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-4 py-2 border border-slate-200 rounded-xl"
            >
              <option value="ALL">Tat ca loai</option>
              <option value="PRIVATE">Private</option>
              <option value="GROUP">Group</option>
              <option value="DEPARTMENT">Department</option>
              <option value="PROJECT">Project</option>
            </select>
            <select
              value={filterLocked}
              onChange={(e) => setFilterLocked(e.target.value)}
              className="px-4 py-2 border border-slate-200 rounded-xl"
            >
              <option value="ALL">Tat ca trang thai</option>
              <option value="ACTIVE">Hoat dong</option>
              <option value="LOCKED">Bi khoa</option>
            </select>
          </div>

          {/* Rooms Table */}
          <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-black text-slate-500 uppercase">Phong</th>
                  <th className="px-6 py-4 text-left text-xs font-black text-slate-500 uppercase">Loai</th>
                  <th className="px-6 py-4 text-left text-xs font-black text-slate-500 uppercase">Thanh vien</th>
                  <th className="px-6 py-4 text-left text-xs font-black text-slate-500 uppercase">Tin nhan</th>
                  <th className="px-6 py-4 text-left text-xs font-black text-slate-500 uppercase">Trang thai</th>
                  <th className="px-6 py-4 text-right text-xs font-black text-slate-500 uppercase">Thao tac</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredRooms.map(room => (
                  <tr key={room.id} className="hover:bg-blue-50/20">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                          <MessageSquare size={18} />
                        </div>
                        <div>
                          <p className="font-bold text-slate-800">{room.name}</p>
                          <p className="text-xs text-slate-400">{room.description || '-'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-bold px-2 py-1 rounded bg-slate-100 text-slate-600">
                        {room.type}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1 text-slate-600">
                        <Users size={16} />
                        <span className="font-bold">{room.memberCount}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600 font-bold">
                      {room.messageCount}
                    </td>
                    <td className="px-6 py-4">
                      {room.isLocked ? (
                        <span className="flex items-center gap-1 text-xs font-bold text-rose-600">
                          <Lock size={14} /> Bi khoa
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs font-bold text-emerald-600">
                          <Unlock size={14} /> Hoat dong
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => {
                          setSelectedRoom(room);
                          fetchRoomMessages(room.id);
                          setIsRoomDetailOpen(true);
                        }}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                      >
                        <Eye size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Messages Tab */}
      {activeTab === 'messages' && (
        <>
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                placeholder="Tim tin nhan..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl"
                onKeyDown={(e) => e.key === 'Enter' && handleSearchMessages()}
              />
            </div>
            <button
              onClick={handleSearchMessages}
              className="bg-blue-600 text-white px-6 py-2 rounded-xl font-bold"
            >
              Tim
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-black text-slate-500 uppercase">Nguoi gui</th>
                  <th className="px-6 py-4 text-left text-xs font-black text-slate-500 uppercase">Noi dung</th>
                  <th className="px-6 py-4 text-left text-xs font-black text-slate-500 uppercase">Phong</th>
                  <th className="px-6 py-4 text-left text-xs font-black text-slate-500 uppercase">Thoi gian</th>
                  <th className="px-6 py-4 text-right text-xs font-black text-slate-500 uppercase">Thao tac</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {messages.map(msg => (
                  <tr key={msg.id} className="hover:bg-blue-50/20">
                    <td className="px-6 py-4 font-bold text-slate-800">{msg.userName}</td>
                    <td className="px-6 py-4 text-slate-600 max-w-md truncate">{msg.text}</td>
                    <td className="px-6 py-4 text-slate-500">{msg.room}</td>
                    <td className="px-6 py-4 text-slate-400 text-sm">
                      {new Date(msg.createdAt).toLocaleString('vi-VN')}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {(isSuperAdmin || isAdmin) && (
                        <button
                          onClick={() => {
                            setSelectedMessage(msg);
                            setIsMessageDetailOpen(true);
                          }}
                          className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg"
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Policy Tab */}
      {activeTab === 'policy' && policy && (
        <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-6">
          <h3 className="text-lg font-bold text-slate-800">Cau hinh chinh sach Chat</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-bold text-slate-700 mb-3">Luu tru tin nhan</h4>
              <div className="space-y-3">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={policy.messageRetention?.enabled ?? true}
                    onChange={(e) => setPolicy({
                      ...policy,
                      messageRetention: { ...policy.messageRetention, enabled: e.target.checked }
                    })}
                    className="rounded"
                  />
                  <span className="text-sm">Enable message retention</span>
                </label>
                <div>
                  <label className="text-xs text-slate-500">So ngay luu tru</label>
                  <input
                    type="number"
                    value={policy.messageRetention?.days ?? 90}
                    onChange={(e) => setPolicy({
                      ...policy,
                      messageRetention: { ...policy.messageRetention, days: parseInt(e.target.value) }
                    })}
                    className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-bold text-slate-700 mb-3">Tai file</h4>
              <div className="space-y-3">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={policy.fileUpload?.enabled ?? true}
                    onChange={(e) => setPolicy({
                      ...policy,
                      fileUpload: { ...policy.fileUpload, enabled: e.target.checked }
                    })}
                    className="rounded"
                  />
                  <span className="text-sm">Allow file upload</span>
                </label>
                <div>
                  <label className="text-xs text-slate-500">Kich thuoc toi da (MB)</label>
                  <input
                    type="number"
                    value={(policy.fileUpload?.maxFileSize ?? 10485760) / 1024 / 1024}
                    onChange={(e) => setPolicy({
                      ...policy,
                      fileUpload: { ...policy.fileUpload, maxFileSize: parseInt(e.target.value) * 1024 * 1024 }
                    })}
                    className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-bold text-slate-700 mb-3">Han che</h4>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-slate-500">Do dai tin nhan toi da</label>
                  <input
                    type="number"
                    value={policy.restrictions?.maxMessageLength ?? 5000}
                    onChange={(e) => setPolicy({
                      ...policy,
                      restrictions: { ...policy.restrictions, maxMessageLength: parseInt(e.target.value) }
                    })}
                    className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500">Tin nhan toi da / phut</label>
                  <input
                    type="number"
                    value={policy.restrictions?.maxMessagesPerMinute ?? 10}
                    onChange={(e) => setPolicy({
                      ...policy,
                      restrictions: { ...policy.restrictions, maxMessagesPerMinute: parseInt(e.target.value) }
                    })}
                    className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-bold text-slate-700 mb-3">Kiem duyet</h4>
              <div className="space-y-3">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={policy.moderation?.enableAutoModeration ?? false}
                    onChange={(e) => setPolicy({
                      ...policy,
                      moderation: { ...policy.moderation, enableAutoModeration: e.target.checked }
                    })}
                    className="rounded"
                  />
                  <span className="text-sm">Enable auto moderation</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={policy.restrictions?.blockAdultContent ?? true}
                    onChange={(e) => setPolicy({
                      ...policy,
                      restrictions: { ...policy.restrictions, blockAdultContent: e.target.checked }
                    })}
                    className="rounded"
                  />
                  <span className="text-sm">Block adult content</span>
                </label>
              </div>
            </div>
          </div>

          <button
            onClick={handleSavePolicy}
            className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700"
          >
            Luu cau hinh
          </button>
        </div>
      )}

      {/* Room Detail Modal */}
      <Modal isOpen={isRoomDetailOpen} onClose={() => setIsRoomDetailOpen(false)} title={selectedRoom?.name || 'Room Details'} size="lg">
        {selectedRoom && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">{selectedRoom.description || 'No description'}</p>
                <p className="text-xs text-slate-400 mt-1">
                  {selectedRoom.memberCount} members - {selectedRoom.messageCount} messages
                </p>
              </div>
              {(isSuperAdmin || isAdmin) && (
                <button
                  onClick={() => handleLockRoom(selectedRoom)}
                  className={`px-4 py-2 rounded-xl font-bold text-sm ${
                    selectedRoom.isLocked
                      ? 'bg-emerald-100 text-emerald-600 hover:bg-emerald-200'
                      : 'bg-rose-100 text-rose-600 hover:bg-rose-200'
                  }`}
                >
                  {selectedRoom.isLocked ? <><Unlock size={16} className="inline mr-1" /> Mo khoa</> : <><Lock size={16} className="inline mr-1" /> Khoa</>}
                </button>
              )}
            </div>

            <div className="border-t border-slate-200 pt-4">
              <h4 className="font-bold text-slate-700 mb-3">Tin nhan gan day</h4>
              <div className="max-h-64 overflow-y-auto space-y-2">
                {messages.slice(0, 10).map(msg => (
                  <div key={msg.id} className="p-2 bg-slate-50 rounded-lg">
                    <div className="flex justify-between">
                      <span className="font-bold text-slate-700 text-sm">{msg.userName}</span>
                      <span className="text-xs text-slate-400">
                        {new Date(msg.createdAt).toLocaleString('vi-VN')}
                      </span>
                    </div>
                    <p className="text-slate-600 text-sm">{msg.text}</p>
                  </div>
                ))}
              </div>
            </div>

            {(isSuperAdmin || isAdmin) && (
              <div className="border-t border-slate-200 pt-4">
                <h4 className="font-bold text-slate-700 mb-3">Gui thong bao he thong</h4>
                <div className="flex gap-2">
                  <input
                    type="text"
                    id="system-message-input"
                    placeholder="Nhap thong bao..."
                    className="flex-1 px-3 py-2 border border-slate-200 rounded-lg"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const input = e.target as HTMLInputElement;
                        handleSendSystemMessage(selectedRoom.id, input.value);
                        input.value = '';
                      }
                    }}
                  />
                  <button
                    onClick={() => {
                      const input = document.getElementById('system-message-input') as HTMLInputElement;
                      handleSendSystemMessage(selectedRoom.id, input.value);
                      input.value = '';
                    }}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg"
                  >
                    <Send size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Delete Message Modal */}
      <Modal isOpen={isMessageDetailOpen} onClose={() => setIsMessageDetailOpen(false)} title="Xoa tin nhan">
        {selectedMessage && (
          <div className="space-y-4">
            <div className="p-3 bg-slate-50 rounded-lg">
              <p className="font-bold text-slate-700">{selectedMessage.userName}</p>
              <p className="text-slate-600">{selectedMessage.text}</p>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">Ly do xoa</label>
              <textarea
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                placeholder="Nhap ly do xoa tin nhan..."
                className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg"
                rows={3}
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setIsMessageDetailOpen(false)}
                className="flex-1 px-4 py-2 border border-slate-200 rounded-xl font-bold"
              >
                Huy
              </button>
              <button
                onClick={handleDeleteMessage}
                className="flex-1 px-4 py-2 bg-rose-600 text-white rounded-xl font-bold hover:bg-rose-700"
              >
                Xoa tin nhan
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Policy Modal */}
      <Modal isOpen={isPolicyOpen} onClose={() => setIsPolicyOpen(false)} title="Cau hinh chinh sach" size="lg">
        {policy && (
          <div className="space-y-4 max-h-96 overflow-y-auto">
            <p className="text-sm text-slate-500">Cau hinh chinh sach chat (tuy chon)</p>
            <button
              onClick={handleSavePolicy}
              className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700"
            >
              Luu
            </button>
          </div>
        )}
      </Modal>

      {/* Admin Chat Tab */}
      {activeTab === 'adminchat' && (
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          <div className="flex h-[600px]">
            {/* User list */}
            <div className="w-80 border-r border-slate-100 flex flex-col">
              <div className="p-4 border-b border-slate-100">
                <h3 className="font-bold text-slate-700 mb-3">Danh sach nguoi dung</h3>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    type="text"
                    placeholder="Tim nguoi dung..."
                    value={adminChatSearch}
                    onChange={(e) => setAdminChatSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm"
                  />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto">
                {filteredChatUsers.map(u => (
                  <button
                    key={u.id}
                    onClick={() => {
                      setSelectedChatUser(u);
                      fetchAdminChatMessages(u.id);
                      // Clear notification for this user
                      setPendingChatNotification((prev: any) => {
                        const next = { ...prev };
                        delete next[u.id];
                        return next;
                      });
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors relative ${
                      selectedChatUser?.id === u.id ? 'bg-blue-50 border-r-2 border-blue-500' : ''
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm">
                      {u.name?.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-bold text-slate-700 text-sm">{u.name}</p>
                      <p className="text-xs text-slate-400">{u.email}</p>
                      {pendingChatNotification[u.id] && (
                        <p className="text-xs text-blue-600 mt-0.5 truncate">
                          {pendingChatNotification[u.id].preview || 'Tin nhắn mới...'}
                        </p>
                      )}
                    </div>
                    {u.role && (
                      <span className="text-xs bg-slate-100 text-slate-500 px-2 py-1 rounded">
                        {u.role}
                      </span>
                    )}
                    {pendingChatNotification[u.id] && (
                      <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Chat area */}
            <div className="flex-1 flex flex-col">
              {selectedChatUser ? (
                <>
                  {/* Chat header */}
                  <div className="p-4 border-b border-slate-100 bg-slate-50">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                        {selectedChatUser.name?.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-slate-700">{selectedChatUser.name}</p>
                        <p className="text-xs text-slate-400">{selectedChatUser.email}</p>
                      </div>
                    </div>
                  </div>

                  {/* Messages */}
                  <div ref={adminChatScrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
                    {adminChatLoading ? (
                      <div className="text-center text-slate-400 py-8">Dang tai tin nhan...</div>
                    ) : adminChatMessages.length === 0 ? (
                      <div className="text-center text-slate-400 py-8">
                        <MessageCircle size={40} className="mx-auto mb-2 opacity-40" />
                        <p>Chua co tin nhan nao</p>
                        <p className="text-xs mt-1">Bat dau cuoc tro chuyen voi {selectedChatUser.name}</p>
                      </div>
                    ) : (
                      adminChatMessages.map(msg => {
                        const isMe = msg.userId === user?.id;
                        const timeValue = msg.timestamp || msg.createdAt;
                        const displayTime = timeValue
                          ? new Date(timeValue).toLocaleString('vi-VN')
                          : 'Vừa xong';
                        return (
                          <div
                            key={msg.id}
                            className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                          >
                            <div
                              className={`max-w-[70%] px-4 py-2.5 rounded-2xl text-sm ${
                                isMe
                                  ? 'bg-blue-600 text-white rounded-br-sm'
                                  : 'bg-white text-slate-700 rounded-bl-sm shadow-sm border border-slate-100'
                              }`}
                            >
                              <p>{msg.text}</p>
                              <p className={`text-[10px] mt-1 ${isMe ? 'text-blue-100' : 'text-slate-400'}`}>
                                {displayTime}
                              </p>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Input */}
                  <div className="p-4 border-t border-slate-200 bg-white">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder={`Nhan tin cho ${selectedChatUser.name}...`}
                        value={adminChatInput}
                        onChange={(e) => setAdminChatInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSendAdminChat()}
                        className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-200"
                      />
                      <button
                        onClick={handleSendAdminChat}
                        disabled={!adminChatInput.trim()}
                        className="bg-blue-600 text-white px-4 py-2.5 rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors"
                      >
                        <Send size={18} />
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                  <MessageCircle size={60} className="mb-4 opacity-30" />
                  <p className="font-medium">Chon nguoi dung de bat dau chat</p>
                  <p className="text-sm mt-1">Chon mot nguoi tu danh sach ben trai</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Toast Notifications */}
      <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
        {toasts.map((toast, idx) => (
          <div
            key={toast.id}
            className="bg-white border border-blue-100 rounded-xl shadow-2xl p-4 animate-in slide-in-from-right fade-in duration-300"
            style={{ animationDelay: `${idx * 50}ms` }}
          >
            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-100 rounded-lg shrink-0">
                <Mail size={16} className="text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm text-slate-800">{toast.title}</p>
                <p className="text-xs text-slate-500 mt-0.5 truncate">{toast.message}</p>
              </div>
              <button
                onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
