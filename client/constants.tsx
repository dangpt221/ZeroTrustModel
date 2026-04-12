
import React from 'react';
import {
  LayoutDashboard,
  Users,
  ShieldCheck,
  Building2,
  FolderLock,
  Activity,
  Settings,
  User,
  History,
  ShieldAlert,
  Fingerprint,
  BarChart3,
  FileCheck,
  FileDown,
  UserCheck,
  MessageSquare,
  MessageCircle,
  Clock,
  LayoutGrid,
  Bell,
  Shield,
} from 'lucide-react';

export const COLORS = {
  primary: '#0f172a',
  accent: '#3b82f6',
  managerPrimary: '#f0f9ff',
  managerAccent: '#0ea5e9',
  memberAccent: '#10b981',
  success: '#22c55e',
  warning: '#f59e0b',
  danger: '#ef4444',
  background: '#f8fafc',
};

export const ADMIN_NAVIGATION = [
  { name: 'Tổng quan Dashboard', icon: <LayoutDashboard size={20} />, path: '/', permissions: [] },
  { name: 'Quản lý người dùng', icon: <Users size={20} />, path: '/admin/users', permissions: ['USER_VIEW', 'USER_CREATE', 'USER_EDIT', 'USER_DELETE', 'USER_APPROVE'] },
  { name: 'Vai trò & Phân quyền', icon: <ShieldCheck size={20} />, path: '/admin/roles', permissions: ['ROLE_VIEW', 'ROLE_MANAGE'] },
  { name: 'Quản lý bộ phận', icon: <Building2 size={20} />, path: '/admin/departments', permissions: ['DEPT_VIEW', 'DEPT_CREATE', 'DEPT_EDIT', 'DEPT_DELETE'] },
  { name: 'Quản lý tài liệu', icon: <FolderLock size={20} />, path: '/admin/documents', permissions: ['DOC_VIEW', 'DOC_UPLOAD', 'DOC_APPROVE', 'DOC_DELETE'] },
  { name: 'Nhắn tin nội bộ', icon: <MessageCircle size={20} />, path: '/messaging', permissions: [] },
  { name: 'Quản lý Chat nội bộ', icon: <MessageSquare size={20} />, path: '/admin/chat', permissions: ['ROLE_VIEW'] }, // using ROLE_VIEW temporarily
  { name: 'Cấu hình Zero Trust', icon: <Fingerprint size={20} />, path: '/admin/zero-trust', permissions: ['ZT_VIEW', 'ZT_MANAGE'] },
  { name: 'Giám sát hệ thống', icon: <History size={20} />, path: '/admin/audit-logs', permissions: ['ZT_VIEW'] },
  { name: 'Quản lý thông báo', icon: <Bell size={20} />, path: '/admin/notifications', permissions: ['NOTIF_SEND'] },
];

export const MANAGER_NAVIGATION = [
  { name: 'Dashboard nhóm', icon: <LayoutDashboard size={20} />, path: '/' },
  { name: 'Quản lý Staff', icon: <Users size={20} />, path: '/manager/staff' },
  { name: 'Tài liệu bộ phận', icon: <FolderLock size={20} />, path: '/manager/documents' },
  { name: 'Nhắn tin nội bộ', icon: <MessageSquare size={20} />, path: '/messaging' },
  { name: 'Hồ sơ & Bảo mật', icon: <User size={20} />, path: '/manager/profile' },
];

export const STAFF_NAVIGATION = [
  { name: 'Tài liệu của tôi', icon: <FolderLock size={20} />, path: '/' },
  { name: 'Nhắn tin nội bộ', icon: <MessageSquare size={20} />, path: '/messaging' },
  { name: 'Hồ sơ & Bảo mật', icon: <User size={20} />, path: '/profile' },
];

export const MOCK_IP = "192.168.1.105";
export const MOCK_DEVICE = "MacBook Pro (Chrome)";
