// API Service for Nexus Zero Trust System
const API_BASE = '/api';

const getAuthHeaders = () => ({
  'Content-Type': 'application/json',
});

// Auth
export const authApi = {
  login: async (email: string, password: string, mfaCode?: string) => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, mfaCode }),
      credentials: 'include',
    });
    return res.json();
  },

  logout: async () => {
    await fetch(`${API_BASE}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    });
  },
};

// Users
export const usersApi = {
  getAll: async () => {
    const res = await fetch(`${API_BASE}/users`, { credentials: 'include' });
    return res.json();
  },

  getAdmin: async () => {
    const res = await fetch(`${API_BASE}/admin/users`, { credentials: 'include' });
    return res.json();
  },

  create: async (data: any) => {
    const res = await fetch(`${API_BASE}/admin/users`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
      credentials: 'include',
    });
    return res.json();
  },

  update: async (id: string, data: any) => {
    const res = await fetch(`${API_BASE}/admin/users/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
      credentials: 'include',
    });
    return res.json();
  },

  delete: async (id: string) => {
    const res = await fetch(`${API_BASE}/admin/users/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    return res.json();
  },

  lock: async (id: string, status: string) => {
    const res = await fetch(`${API_BASE}/admin/users/${id}/lock`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ status }),
      credentials: 'include',
    });
    return res.json();
  },

  toggleMfa: async (id: string, enabled: boolean) => {
    const res = await fetch(`${API_BASE}/admin/users/${id}/mfa`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ enabled }),
      credentials: 'include',
    });
    return res.json();
  },

  getList: async () => {
    const res = await fetch(`${API_BASE}/users`, { credentials: 'include' });
    return res.json();
  },
};

// Departments
export const departmentsApi = {
  getAll: async () => {
    const res = await fetch(`${API_BASE}/departments`, { credentials: 'include' });
    return res.json();
  },

  create: async (data: any) => {
    const res = await fetch(`${API_BASE}/departments`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
      credentials: 'include',
    });
    return res.json();
  },

  update: async (id: string, data: any) => {
    const res = await fetch(`${API_BASE}/departments/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
      credentials: 'include',
    });
    return res.json();
  },
};

// Roles & Permissions
export const rolesApi = {
  getAll: async () => {
    const res = await fetch(`${API_BASE}/admin/roles`, { credentials: 'include' });
    return res.json();
  },

  create: async (data: any) => {
    const res = await fetch(`${API_BASE}/admin/roles`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
      credentials: 'include',
    });
    return res.json();
  },

  update: async (id: string, data: any) => {
    const res = await fetch(`${API_BASE}/admin/roles/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
      credentials: 'include',
    });
    return res.json();
  },

  delete: async (id: string) => {
    const res = await fetch(`${API_BASE}/admin/roles/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    return res.json();
  },

  getPermissions: async () => {
    const res = await fetch(`${API_BASE}/admin/permissions`, { credentials: 'include' });
    return res.json();
  },
};

// Documents
export const documentsApi = {
  getAll: async () => {
    const res = await fetch(`${API_BASE}/documents`, { credentials: 'include' });
    return res.json();
  },

  create: async (data: any) => {
    const res = await fetch(`${API_BASE}/documents`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
      credentials: 'include',
    });
    return res.json();
  },

  delete: async (id: string) => {
    const res = await fetch(`${API_BASE}/documents/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    return res.json();
  },

  getRequests: async () => {
    const res = await fetch(`${API_BASE}/document-requests`, { credentials: 'include' });
    return res.json();
  },

  createRequest: async (documentId: string, reason: string) => {
    const res = await fetch(`${API_BASE}/document-requests`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ documentId, reason }),
      credentials: 'include',
    });
    return res.json();
  },

  updateRequest: async (id: string, status: string) => {
    const res = await fetch(`${API_BASE}/document-requests/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ status }),
      credentials: 'include',
    });
    return res.json();
  },
};

// Projects
export const projectsApi = {
  getAll: async () => {
    const res = await fetch(`${API_BASE}/projects`, { credentials: 'include' });
    return res.json();
  },

  getById: async (id: string) => {
    const res = await fetch(`${API_BASE}/projects/${id}`, { credentials: 'include' });
    return res.json();
  },

  create: async (data: any) => {
    const res = await fetch(`${API_BASE}/projects`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
      credentials: 'include',
    });
    return res.json();
  },

  update: async (id: string, data: any) => {
    const res = await fetch(`${API_BASE}/projects/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
      credentials: 'include',
    });
    return res.json();
  },

  getTasks: async (projectId: string) => {
    const res = await fetch(`${API_BASE}/projects/${projectId}/tasks`, { credentials: 'include' });
    return res.json();
  },

  createTask: async (projectId: string, data: any) => {
    const res = await fetch(`${API_BASE}/projects/${projectId}/tasks`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
      credentials: 'include',
    });
    return res.json();
  },

  updateTask: async (taskId: string, data: any) => {
    const res = await fetch(`${API_BASE}/tasks/${taskId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
      credentials: 'include',
    });
    return res.json();
  },
};

// Teams
export const teamsApi = {
  getAll: async () => {
    const res = await fetch(`${API_BASE}/teams`, { credentials: 'include' });
    return res.json();
  },

  create: async (data: any) => {
    const res = await fetch(`${API_BASE}/teams`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
      credentials: 'include',
    });
    return res.json();
  },

  addMember: async (teamId: string, userId: string) => {
    const res = await fetch(`${API_BASE}/teams/${teamId}/members`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ userId }),
      credentials: 'include',
    });
    return res.json();
  },
};

// Audit Logs
export const auditLogsApi = {
  getAll: async () => {
    const res = await fetch(`${API_BASE}/audit-logs`, { credentials: 'include' });
    return res.json();
  },
};

// Attendance
export const attendanceApi = {
  checkIn: async () => {
    const res = await fetch(`${API_BASE}/attendance/check-in`, {
      method: 'POST',
      credentials: 'include',
    });
    return res.json();
  },

  getHistory: async () => {
    const res = await fetch(`${API_BASE}/attendance/history`, { credentials: 'include' });
    return res.json();
  },
};

// Messages
export const messagesApi = {
  getAll: async () => {
    const res = await fetch(`${API_BASE}/messages`, { credentials: 'include' });
    return res.json();
  },
};

// Zero Trust Config
export const zeroTrustApi = {
  getConfig: async () => {
    const res = await fetch(`${API_BASE}/zero-trust/config`, { credentials: 'include' });
    return res.json();
  },

  updateConfig: async (data: any) => {
    const res = await fetch(`${API_BASE}/zero-trust/config`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
      credentials: 'include',
    });
    return res.json();
  },
};

// Notifications
export const notificationsApi = {
  getAll: async () => {
    const res = await fetch(`${API_BASE}/notifications`, { credentials: 'include' });
    return res.json();
  },

  getAllAdmin: async () => {
    const res = await fetch(`${API_BASE}/notifications/all`, { credentials: 'include' });
    return res.json();
  },

  create: async (data: { userId: string; title: string; message: string; type?: string; priority?: string }) => {
    const res = await fetch(`${API_BASE}/notifications`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
      credentials: 'include',
    });
    return res.json();
  },

  broadcast: async (data: { userIds: string[]; title: string; message: string; type?: string; priority?: string }) => {
    const res = await fetch(`${API_BASE}/notifications/broadcast`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
      credentials: 'include',
    });
    return res.json();
  },

  markAsRead: async (notificationId: string) => {
    const res = await fetch(`${API_BASE}/notifications/${notificationId}/read`, {
      method: 'PUT',
      credentials: 'include',
    });
    return res.json();
  },

  markAllAsRead: async () => {
    const res = await fetch(`${API_BASE}/notifications/read-all`, {
      method: 'PUT',
      credentials: 'include',
    });
    return res.json();
  },

  getUnreadCount: async () => {
    const res = await fetch(`${API_BASE}/notifications/unread-count`, { credentials: 'include' });
    return res.json();
  },
};
