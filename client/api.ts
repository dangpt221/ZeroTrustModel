import {
  User,
  Project,
  Task,
  Department,
  Team,
  Document,
  Attendance,
  Message,
  Notification,
  AuditLog,
  Role,
  Permission,
  ZeroTrustConfig
} from './types';

// Base API URL
const API_URL = '/api';

// Helper function for making API requests
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    let msg = `HTTP ${response.status}`;
    try {
      const data = await response.json();
      msg = data.message || msg;
    } catch (_) { /* ignore parse error */ }
    throw new Error(msg);
  }

  return response.json();
}

// ==================== Projects API ====================
export const projectsApi = {
  getAll: () => apiRequest<Project[]>('/projects'),

  getById: (id: string) => apiRequest<Project>(`/projects/${id}`),

  create: (data: Partial<Project>) =>
    apiRequest<Project>('/projects', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: Partial<Project>) =>
    apiRequest<Project>(`/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    apiRequest<void>(`/projects/${id}`, { method: 'DELETE' }),

  getTasks: (projectId: string) =>
    apiRequest<Task[]>(`/projects/${projectId}/tasks`),

  createTask: (projectId: string, data: Partial<Task>) =>
    apiRequest<Task>(`/projects/${projectId}/tasks`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateTask: (taskId: string, data: Partial<Task>) =>
    apiRequest<Task>(`/tasks/${taskId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
};

// ==================== Users API ====================
export const usersApi = {
  getAll: () => apiRequest<User[]>('/users'), // Use /users instead of /admin/users for manager

  getList: () => apiRequest<User[]>('/users'),

  getById: (id: string) => apiRequest<User>(`/users/${id}`),

  create: (data: { name: string; email: string; password: string; role: string; departmentId?: string; mfaEnabled?: boolean }) =>
    apiRequest<User>('/admin/users', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: Partial<User> & { password?: string }) =>
    apiRequest<User>(`/admin/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    apiRequest<void>(`/admin/users/${id}`, { method: 'DELETE' }),

  lock: (id: string, status: string) =>
    apiRequest<User>(`/admin/users/${id}/lock`, {
      method: 'POST',
      body: JSON.stringify({ status }),
    }),

  approve: (id: string) =>
    apiRequest<User>(`/admin/users/${id}/approve`, { method: 'POST' }),

  reject: (id: string) =>
    apiRequest<void>(`/admin/users/${id}/reject`, { method: 'POST' }),

  toggleMfa: (id: string, enabled: boolean) =>
    apiRequest<User>(`/admin/users/${id}/mfa`, {
      method: 'POST',
      body: JSON.stringify({ enabled }),
    }),

  resetPassword: (id: string) =>
    apiRequest<{ message: string }>(`/admin/users/${id}/reset-password`, {
      method: 'POST',
    }),

  // Manager endpoints
  getTeamMembers: () => apiRequest<User[]>('/manager/users'),

  updateTeamMember: (id: string, data: { name?: string; role?: string; mfaEnabled?: boolean }) =>
    apiRequest<User>(`/manager/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  lockTeamMember: (id: string, status: string) =>
    apiRequest<User>(`/manager/users/${id}/lock`, {
      method: 'POST',
      body: JSON.stringify({ status }),
    }),

  // Profile management
  updateProfile: (data: { name?: string; avatar?: string }) =>
    apiRequest<User>('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    apiRequest<User>('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
};

// ==================== Departments API ====================
export const departmentsApi = {
  getAll: () => apiRequest<Department[]>('/departments'),

  getById: (id: string) => apiRequest<Department>(`/departments/${id}`),

  getStats: () => apiRequest<any>('/departments-stats/stats'),

  create: (data: { name: string; description?: string; managerId?: string; parentId?: string; color?: string; code?: string }) =>
    apiRequest<Department>('/departments', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: { name?: string; description?: string; managerId?: string; parentId?: string; isActive?: boolean; color?: string; code?: string }) =>
    apiRequest<Department>(`/departments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id: string, moveMembersTo?: string) =>
    apiRequest<void>(`/departments/${id}`, {
      method: 'DELETE',
      body: JSON.stringify({ moveMembersTo }),
    }),

  assignMember: (deptId: string, userId: string, role?: string) =>
    apiRequest<any>(`/departments/${deptId}/members`, {
      method: 'POST',
      body: JSON.stringify({ userId, role }),
    }),

  removeMember: (deptId: string, userId: string) =>
    apiRequest<any>(`/departments/${deptId}/members/${userId}`, {
      method: 'DELETE',
    }),
};

// ==================== Teams API ====================
export const teamsApi = {
  getAll: () => apiRequest<Team[]>('/teams'),

  getMyTeams: () => apiRequest<Team[]>('/teams/me'),

  getById: (id: string) => apiRequest<Team>(`/teams/${id}`),

  create: (data: Partial<Team>) =>
    apiRequest<Team>('/teams', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: Partial<Team>) =>
    apiRequest<Team>(`/teams/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    apiRequest<void>(`/teams/${id}`, { method: 'DELETE' }),

  addMember: (teamId: string, userId: string) =>
    apiRequest<Team>(`/teams/${teamId}/members`, {
      method: 'POST',
      body: JSON.stringify({ userId }),
    }),

  removeMember: (teamId: string, userId: string) =>
    apiRequest<Team>(`/teams/${teamId}/members/${userId}`, {
      method: 'DELETE',
    }),
};

// ==================== Documents API ====================
export const documentsApi = {
  getAll: (params?: { search?: string; department?: string; project?: string; status?: string; classification?: string; sensitivity?: string; page?: number; limit?: number }) => {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) query.append(key, String(value));
      });
    }
    const queryString = query.toString();
    return apiRequest<{ documents: Document[]; pagination: any }>(`/documents${queryString ? `?${queryString}` : ''}`);
  },

  getById: (id: string) => apiRequest<Document>(`/documents/${id}`),

  create: (data: Partial<Document>) =>
    apiRequest<Document>('/documents', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Upload file and get info
  uploadFile: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('/api/documents/upload', {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Upload failed' }));
      throw new Error(error.message || 'Upload failed');
    }

    return response.json();
  },

  // Upload new version
  uploadVersion: async (id: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`/api/documents/${id}/upload`, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Upload failed' }));
      throw new Error(error.message || 'Upload failed');
    }

    return response.json();
  },

  update: (id: string, data: Partial<Document>) =>
    apiRequest<Document>(`/documents/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    apiRequest<void>(`/documents/${id}`, { method: 'DELETE' }),

  // Approval workflow
  approve: (id: string) =>
    apiRequest<Document>(`/documents/${id}/approve`, { method: 'POST' }),

  reject: (id: string, reason?: string) =>
    apiRequest<Document>(`/documents/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),

  // Requests workflow
  getRequests: () => apiRequest<any[]>('/documents/requests'),

  updateRequest: (id: string, status: 'APPROVED' | 'REJECTED', reason?: string) =>
    apiRequest<any>(`/documents/requests/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ status, reason }),
    }),

  // Revoke document access (Admin only)
  revokeAccess: (id: string) =>
    apiRequest<any>(`/documents/requests/${id}/revoke`, {
      method: 'POST',
    }),

  // Download
  download: (id: string) =>
    apiRequest<{ url: string; fileName: string }>(`/documents/${id}/download`),

  // Statistics
  getStats: () =>
    apiRequest<{ total: number; byStatus: Record<string, number>; byClassification: Record<string, number> }>('/documents-stats/stats'),

  // Password protection (Admin only)
  setPassword: (id: string, password: string) =>
    apiRequest<{ message: string; isPasswordProtected: boolean }>(`/documents/${id}/password`, {
      method: 'POST',
      body: JSON.stringify({ password }),
    }),

  // Lock/Unlock document (Admin only)
  toggleLock: (id: string, isLocked: boolean) =>
    apiRequest<{ message: string; isLocked: boolean }>(`/documents/${id}/lock`, {
      method: 'POST',
      body: JSON.stringify({ isLocked }),
    }),

  // Request access to document
  requestAccess: (id: string, reason: string) =>
    apiRequest<{ message: string; request?: any }>(`/documents/${id}/request`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),

  // Get my requests
  getMyRequests: () =>
    apiRequest<any[]>('/documents/requests/my', {
      method: 'GET',
    }),

  // Reset document access (Admin only - unlocks after failed attempts)
  resetAccess: (id: string) =>
    apiRequest<{ message: string; failedAttempts: number }>(`/documents/${id}/reset-access`, {
      method: 'POST',
    }),

  // Verify document password
  verifyPassword: (id: string, password: string) =>
    apiRequest<{ verified: boolean; message?: string; locked?: boolean; failedAttempts?: number }>(`/documents/${id}/verify`, {
      method: 'POST',
      body: JSON.stringify({ password }),
    }),
};

// ==================== Attendance API ====================
export const attendanceApi = {
  checkIn: (data?: { location?: string; device?: string }) =>
    apiRequest<Attendance>('/attendance/check-in', {
      method: 'POST',
      body: JSON.stringify(data || {}),
    }),

  checkOut: (data?: { location?: string; device?: string }) =>
    apiRequest<Attendance>('/attendance/check-out', {
      method: 'POST',
      body: JSON.stringify(data || {}),
    }),

  getHistory: () => apiRequest<Attendance[]>('/attendance/history'),
};

// ==================== Messages API ====================
export const messagesApi = {
  getMessages: (room?: string) => {
    const endpoint = room ? `/messages?room=${encodeURIComponent(room)}` : '/messages';
    return apiRequest<Message[]>(endpoint);
  },

  sendMessage: (data: { text: string; room?: string }) =>
    apiRequest<Message>('/messages', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

// ==================== Notifications API ====================
export const notificationsApi = {
  // User notifications
  getAll: () => apiRequest<Notification[]>('/notifications'),

  getAllAdmin: () => apiRequest<Notification[]>('/notifications/all'),

  create: (data: { userId: string; title: string; message: string; type?: string; priority?: string }) =>
    apiRequest<Notification>('/notifications', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getUnreadCount: () => apiRequest<{ count: number }>('/notifications/unread-count'),

  markAsRead: (id: string) =>
    apiRequest<void>(`/notifications/${id}/read`, { method: 'PUT' }),

  markAllAsRead: () =>
    apiRequest<void>('/notifications/read-all', { method: 'PUT' }),

  broadcast: (data: { userIds: string[]; title: string; message: string; type?: string; priority?: string; sendToAll?: boolean }) =>
    apiRequest<{ message: string; count: number }>('/notifications/broadcast', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    apiRequest<void>(`/notifications/${id}`, { method: 'DELETE' }),
};

// ==================== Audit Logs API ====================
export const auditLogsApi = {
  getAll: () => apiRequest<AuditLog[]>('/audit-logs'),

  getMine: () => apiRequest<AuditLog[]>('/audit-logs/me'),
};

// ==================== Zero Trust API ====================
export const zeroTrustApi = {
  getConfig: () => apiRequest<ZeroTrustConfig>('/zero-trust/config'),

  updateConfig: (data: Partial<ZeroTrustConfig>) =>
    apiRequest<{ id: string }>('/zero-trust/config', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
};

// ==================== Roles API ====================
export const rolesApi = {
  // Roles
  getAll: () => apiRequest<Role[]>('/roles'),

  getRoles: () => apiRequest<Role[]>('/roles'),

  getById: (id: string) => apiRequest<Role>(`/roles/${id}`),

  create: (data: { name: string; description?: string; permissions?: string[]; color?: string }) =>
    apiRequest<Role>('/roles', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: { name?: string; description?: string; permissions?: string[]; color?: string; isActive?: boolean }) =>
    apiRequest<Role>(`/roles/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    apiRequest<void>(`/roles/${id}`, { method: 'DELETE' }),

  // Get users by role
  getUsersByRole: (roleName: string) =>
    apiRequest<User[]>(`/roles/${encodeURIComponent(roleName)}/users`),

  // Permissions
  getPermissions: () => apiRequest<Permission[]>('/permissions'),
};

// ==================== Chat Management API ====================
export const chatManagementApi = {
  // Statistics
  getStats: () => apiRequest<any>('/chat/stats'),

  // Rooms
  getRooms: (params?: { type?: string; search?: string; isLocked?: boolean; department?: string; page?: number; limit?: number }) => {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) query.append(key, String(value));
      });
    }
    const queryString = query.toString();
    return apiRequest<{ rooms: any[]; pagination: any }>(`/chat/rooms${queryString ? `?${queryString}` : ''}`);
  },

  getRoomById: (id: string) => apiRequest<any>(`/chat/rooms/${id}`),

  getRoomMessages: (id: string, params?: { page?: number; limit?: number; startDate?: string; endDate?: string; userId?: string }) => {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) query.append(key, String(value));
      });
    }
    const queryString = query.toString();
    return apiRequest<{ messages: any[]; pagination: any }>(`/chat/rooms/${id}/messages${queryString ? `?${queryString}` : ''}`);
  },

  // Search messages
  searchMessages: (params: { keyword?: string; roomId?: string; userId?: string; startDate?: string; endDate?: string; page?: number; limit?: number }) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) query.append(key, String(value));
    });
    return apiRequest<{ messages: any[]; pagination: any }>(`/chat/messages/search?${query.toString()}`);
  },

  // Message actions
  deleteMessage: (id: string, reason?: string) =>
    apiRequest<{ success: boolean }>(`/chat/messages/${id}`, {
      method: 'DELETE',
      body: JSON.stringify({ reason }),
    }),

  // Room actions
  lockRoom: (id: string, lock: boolean, reason?: string) =>
    apiRequest<any>(`/chat/rooms/${id}/lock`, {
      method: 'POST',
      body: JSON.stringify({ lock, reason }),
    }),

  addRoomMember: (id: string, userId: string, role?: string) =>
    apiRequest<any>(`/chat/rooms/${id}/members`, {
      method: 'POST',
      body: JSON.stringify({ userId, role }),
    }),

  removeRoomMember: (id: string, userId: string) =>
    apiRequest<any>(`/chat/rooms/${id}/members/${userId}`, { method: 'DELETE' }),

  sendSystemMessage: (id: string, text: string, attachments?: any[]) =>
    apiRequest<any>(`/chat/rooms/${id}/system-message`, {
      method: 'POST',
      body: JSON.stringify({ text, attachments }),
    }),

  deleteRoom: (id: string) =>
    apiRequest<{ success: boolean }>(`/chat/rooms/${id}`, { method: 'DELETE' }),

  // Export
  exportLogs: (params?: { roomId?: string; startDate?: string; endDate?: string; format?: string }) => {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) query.append(key, String(value));
      });
    }
    return fetch(`/api/chat/export?${query.toString()}`, { credentials: 'include' })
      .then(res => {
        if (!res.ok) throw new Error('Export failed');
        if (params?.format === 'csv') return res.blob();
        return res.json();
      });
  },

  // Policy
  getPolicy: () => apiRequest<any>('/chat/policy'),

  updatePolicy: (data: any) =>
    apiRequest<any>('/chat/policy', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // Create room with join code (Manager/Admin)
  createRoomWithCode: (data: { name: string; description?: string; type?: string }) =>
    apiRequest<{ success: boolean; room: any; joinCode: string }>('/chat/rooms/create-with-code', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Join room by code (Staff)
  joinRoomByCode: (joinCode: string) =>
    apiRequest<{ success: boolean; room: any }>('/chat/rooms/join-by-code', {
      method: 'POST',
      body: JSON.stringify({ joinCode }),
    }),

  // Regenerate join code (Manager/Admin - room owner)
  regenerateJoinCode: (roomId: string) =>
    apiRequest<{ success: boolean; joinCode: string }>(`/chat/rooms/${roomId}/regenerate-code`, {
      method: 'POST',
    }),

  // Admin chat with users
  getAdminChatMessages: (userId: string) =>
    apiRequest<{ messages: any[]; conversationId?: string }>(`/chat/chat/messages/${userId}`),

  sendAdminChatMessage: (userId: string, text: string) =>
    apiRequest<any>(`/chat/chat/messages/${userId}`, {
      method: 'POST',
      body: JSON.stringify({ text }),
    }),

  deleteAdminChatMessage: (messageId: string) =>
    apiRequest<{ success: boolean }>(`/chat/chat/messages/${messageId}`, {
      method: 'DELETE',
    }),
};
