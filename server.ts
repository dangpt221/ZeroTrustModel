
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { createServer as createViteServer } from 'vite';
import jwt from 'jsonwebtoken';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const JWT_SECRET = process.env.JWT_SECRET || 'nexus-super-secret-key';

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  app.use(express.json());
  app.use(cookieParser());
  app.use(cors());

  // --- Mock Database (In-memory) ---
  const messages: any[] = [];
  const attendance: any[] = [];
  const auditLogs: any[] = [];
  const teams: any[] = [];

  // Core identity & admin data (single source of truth for frontend)
  const users: any[] = [
    {
      id: 'u1',
      name: 'Admin User',
      email: 'admin@nexus.com',
      role: 'ADMIN',
      avatar: 'https://picsum.photos/seed/admin/200',
      mfaEnabled: true,
      department: 'Cyber Security',
      lastLogin: '2024-05-20T10:00:00Z',
      trustScore: 98,
      ipAddress: '192.168.1.105',
      device: 'MacBook Pro (Chrome)',
      status: 'ACTIVE'
    },
    {
      id: 'u2',
      name: 'Project Manager',
      email: 'manager@nexus.com',
      role: 'MANAGER',
      avatar: 'https://picsum.photos/seed/manager/200',
      mfaEnabled: true,
      department: 'Engineering',
      lastLogin: '2024-05-20T09:30:00Z',
      trustScore: 85,
      ipAddress: '192.168.1.110',
      device: 'Windows PC (Edge)',
      status: 'ACTIVE'
    },
    {
      id: 'u3',
      name: 'Member User',
      email: 'member@nexus.com',
      role: 'MEMBER',
      avatar: 'https://picsum.photos/seed/member/200',
      mfaEnabled: true,
      department: 'Engineering',
      lastLogin: '2024-05-20T08:15:00Z',
      trustScore: 72,
      ipAddress: '192.168.1.120',
      device: 'iPhone 15 (Safari)',
      status: 'ACTIVE'
    },
    {
      id: 'u4',
      name: 'Suspicious User',
      email: 'intruder@external.com',
      role: 'MEMBER',
      avatar: 'https://picsum.photos/seed/intruder/200',
      mfaEnabled: false,
      department: 'External',
      lastLogin: '2024-05-19T23:00:00Z',
      trustScore: 15,
      ipAddress: '103.45.21.99',
      device: 'Unknown Linux',
      status: 'LOCKED'
    }
  ];

  const permissions: any[] = [
    { id: 'p1', name: 'Xem báo cáo SOC', code: 'VIEW_SOC_REPORTS', description: 'Quyền xem log bảo mật hệ thống' },
    { id: 'p2', name: 'Quản lý User', code: 'MANAGE_USERS', description: 'Thêm, sửa, khóa tài khoản' },
    { id: 'p3', name: 'Phê duyệt tài liệu', code: 'APPROVE_DOCS', description: 'Quyền xem tài liệu mức độ High' },
    { id: 'p4', name: 'Cấu hình Zero Trust', code: 'CONFIG_ZERO_TRUST', description: 'Thay đổi chính sách bảo mật' },
  ];

  const roles: any[] = [
    { id: 'r1', name: 'Global Administrator', permissions: ['p1', 'p2', 'p3', 'p4'], color: 'bg-blue-600' },
    { id: 'r2', name: 'Security Manager', permissions: ['p1', 'p3', 'p4'], color: 'bg-rose-600' },
    { id: 'r3', name: 'Department Lead', permissions: ['p3'], color: 'bg-amber-600' },
    { id: 'r4', name: 'Regular Staff', permissions: [], color: 'bg-emerald-600' },
  ];

  const departments: any[] = [
    { id: 'd1', name: 'Engineering', managerId: 'u2', memberCount: 156, description: 'Phát triển hạ tầng và phần mềm core' },
    { id: 'd2', name: 'Cyber Security', managerId: 'u1', memberCount: 24, description: 'Giám sát an ninh mạng và SOC' },
    { id: 'd3', name: 'Human Resources', managerId: 'u4', memberCount: 12, description: 'Quản lý nhân sự và chính sách nội bộ' },
  ];

  const documents: any[] = [
    {
      id: 'd1',
      projectId: 'p1',
      name: 'Migration_Plan.pdf',
      type: 'pdf',
      size: '2.4 MB',
      uploadedBy: 'u2',
      uploadedAt: '2024-01-15',
      url: '#',
      sensitivity: 'HIGH',
      department: 'Engineering'
    },
    {
      id: 'd2',
      projectId: 'p1',
      name: 'Cost_Estimation.xlsx',
      type: 'xlsx',
      size: '1.1 MB',
      uploadedBy: 'u1',
      uploadedAt: '2024-01-20',
      url: '#',
      sensitivity: 'MEDIUM',
      department: 'Cyber Security'
    }
  ];

  let zeroTrustConfig: any = {
    mfaRequired: true,
    maxLoginFails: 5,
    trustScoreThreshold: 70,
    allowExternalIP: false,
    alertOnNewDevice: true,
    ipWhitelist: ['192.168.1.0/24', '10.0.0.1']
  };

  // --- Middleware ---
  const authenticateToken = (req: any, res: any, next: any) => {
    const token = req.cookies.token || req.headers['authorization']?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Unauthorized' });

    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
      if (err) return res.status(403).json({ message: 'Forbidden' });
      req.user = user;
      next();
    });
  };

  // --- API Routes ---

  // Auth
  app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    // Simple mock check
    if (password === 'nexus123') {
      const foundUser = users.find(u => u.email === email);
      if (!foundUser) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      const tokenPayload = {
        id: foundUser.id,
        email: foundUser.email,
        role: foundUser.role,
        name: foundUser.name
      };

      const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '24h' });
      res.cookie('token', token, { httpOnly: true, secure: true, sameSite: 'none' });
      
      // Log activity
      auditLogs.push({
        id: Date.now().toString(),
        userId: foundUser.id,
        userName: foundUser.name,
        action: 'LOGIN_SUCCESS',
        timestamp: new Date().toISOString(),
        details: 'User logged in successfully',
        ipAddress: req.ip,
        status: 'SUCCESS',
        riskLevel: 'LOW'
      });

      return res.json({ user: foundUser, token });
    }
    res.status(401).json({ message: 'Invalid credentials' });
  });

  app.post('/api/auth/logout', (req, res) => {
    res.clearCookie('token');
    res.json({ message: 'Logged out' });
  });

  // Attendance
  app.post('/api/attendance/check-in', authenticateToken, (req: any, res) => {
    const entry = {
      id: Date.now().toString(),
      userId: req.user.id,
      type: 'CHECK_IN',
      timestamp: new Date().toISOString(),
      location: 'Office (HQ)',
      device: 'Authorized Device'
    };
    attendance.push(entry);
    res.json(entry);
  });

  app.get('/api/attendance/history', authenticateToken, (req: any, res) => {
    const history = attendance.filter(a => a.userId === req.user.id);
    res.json(history);
  });

  // Messaging
  app.get('/api/messages', authenticateToken, (req, res) => {
    res.json(messages.slice(-50));
  });

  // Audit Logs
  app.get('/api/audit-logs', authenticateToken, (req: any, res) => {
    if (req.user.role !== 'ADMIN') return res.status(403).json({ message: 'Admin only' });
    res.json(auditLogs);
  });

  // Team Management
  app.get('/api/teams', authenticateToken, (req: any, res) => {
    const userTeams = teams.filter(t => t.managerId === req.user.id || t.members.includes(req.user.id));
    res.json(userTeams);
  });

  app.post('/api/teams', authenticateToken, (req: any, res) => {
    if (req.user.role !== 'MANAGER' && req.user.role !== 'ADMIN') return res.status(403).json({ message: 'Manager only' });
    const { name, description, members } = req.body;
    const newTeam = {
      id: Date.now().toString(),
      name,
      description,
      managerId: req.user.id,
      members: members || [],
      createdAt: new Date().toISOString()
    };
    teams.push(newTeam);
    res.json(newTeam);
  });

  app.post('/api/teams/:id/members', authenticateToken, (req: any, res) => {
    const { id } = req.params;
    const { userId } = req.body;
    const team = teams.find(t => t.id === id);
    if (!team) return res.status(404).json({ message: 'Team not found' });
    if (team.managerId !== req.user.id && req.user.role !== 'ADMIN') return res.status(403).json({ message: 'Unauthorized' });
    
    if (!team.members.includes(userId)) {
      team.members.push(userId);
    }
    res.json(team);
  });

  app.get('/api/users', authenticateToken, (req: any, res) => {
    // Simple list for non-admin features (manager views, etc.)
    res.json(users.map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      department: u.department
    })));
  });

  // --- Admin: Users management ---
  app.get('/api/admin/users', authenticateToken, (req: any, res) => {
    if (req.user.role !== 'ADMIN') return res.status(403).json({ message: 'Admin only' });
    res.json(users);
  });

  app.post('/api/admin/users', authenticateToken, (req: any, res) => {
    if (req.user.role !== 'ADMIN') return res.status(403).json({ message: 'Admin only' });
    const { name, email, role, department } = req.body;
    const newUser = {
      id: Date.now().toString(),
      name,
      email,
      role: role || 'MEMBER',
      avatar: `https://picsum.photos/seed/${Date.now()}/200`,
      mfaEnabled: false,
      department: department || 'Engineering',
      lastLogin: new Date().toISOString(),
      trustScore: 80,
      ipAddress: '192.168.1.200',
      device: 'New Device',
      status: 'ACTIVE'
    };
    users.push(newUser);
    res.status(201).json(newUser);
  });

  app.put('/api/admin/users/:id', authenticateToken, (req: any, res) => {
    if (req.user.role !== 'ADMIN') return res.status(403).json({ message: 'Admin only' });
    const { id } = req.params;
    const user = users.find(u => u.id === id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    Object.assign(user, req.body);
    res.json(user);
  });

  app.delete('/api/admin/users/:id', authenticateToken, (req: any, res) => {
    if (req.user.role !== 'ADMIN') return res.status(403).json({ message: 'Admin only' });
    const { id } = req.params;
    const index = users.findIndex(u => u.id === id);
    if (index === -1) return res.status(404).json({ message: 'User not found' });
    const [removed] = users.splice(index, 1);
    res.json(removed);
  });

  app.post('/api/admin/users/:id/lock', authenticateToken, (req: any, res) => {
    if (req.user.role !== 'ADMIN') return res.status(403).json({ message: 'Admin only' });
    const { id } = req.params;
    const { status } = req.body;
    const user = users.find(u => u.id === id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    user.status = status === 'LOCKED' ? 'LOCKED' : 'ACTIVE';

    auditLogs.push({
      id: Date.now().toString(),
      userId: req.user.id,
      userName: req.user.name,
      action: status === 'LOCKED' ? 'ADMIN_LOCK_USER' : 'ADMIN_UNLOCK_USER',
      timestamp: new Date().toISOString(),
      details: `Admin changed status of ${user.email} to ${user.status}`,
      ipAddress: req.ip,
      status: 'SUCCESS',
      riskLevel: 'MEDIUM'
    });

    res.json(user);
  });

  // --- Admin: Roles & Permissions (RBAC) ---
  app.get('/api/admin/permissions', authenticateToken, (req: any, res) => {
    if (req.user.role !== 'ADMIN') return res.status(403).json({ message: 'Admin only' });
    res.json(permissions);
  });

  app.get('/api/admin/roles', authenticateToken, (req: any, res) => {
    if (req.user.role !== 'ADMIN') return res.status(403).json({ message: 'Admin only' });
    res.json(roles);
  });

  app.post('/api/admin/roles', authenticateToken, (req: any, res) => {
    if (req.user.role !== 'ADMIN') return res.status(403).json({ message: 'Admin only' });
    const { name, permissions: permIds } = req.body;
    if (!name) return res.status(400).json({ message: 'Name is required' });

    const palette = ['bg-blue-600', 'bg-emerald-600', 'bg-amber-600', 'bg-rose-600', 'bg-violet-600'];
    const color = palette[roles.length % palette.length];

    const newRole = {
      id: `r${Date.now()}`,
      name,
      permissions: Array.isArray(permIds) ? permIds : [],
      color
    };
    roles.push(newRole);

    auditLogs.push({
      id: Date.now().toString(),
      userId: req.user.id,
      userName: req.user.name,
      action: 'ADMIN_CREATE_ROLE',
      timestamp: new Date().toISOString(),
      details: `Admin created role ${name}`,
      ipAddress: req.ip,
      status: 'SUCCESS',
      riskLevel: 'LOW'
    });

    res.status(201).json(newRole);
  });

  app.put('/api/admin/roles/:id', authenticateToken, (req: any, res) => {
    if (req.user.role !== 'ADMIN') return res.status(403).json({ message: 'Admin only' });
    const { id } = req.params;
    const role = roles.find(r => r.id === id);
    if (!role) return res.status(404).json({ message: 'Role not found' });

    Object.assign(role, req.body);

    auditLogs.push({
      id: Date.now().toString(),
      userId: req.user.id,
      userName: req.user.name,
      action: 'ADMIN_UPDATE_ROLE',
      timestamp: new Date().toISOString(),
      details: `Admin updated role ${role.name}`,
      ipAddress: req.ip,
      status: 'SUCCESS',
      riskLevel: 'LOW'
    });

    res.json(role);
  });

  app.delete('/api/admin/roles/:id', authenticateToken, (req: any, res) => {
    if (req.user.role !== 'ADMIN') return res.status(403).json({ message: 'Admin only' });
    const { id } = req.params;
    const index = roles.findIndex(r => r.id === id);
    if (index === -1) return res.status(404).json({ message: 'Role not found' });
    const [removed] = roles.splice(index, 1);

    auditLogs.push({
      id: Date.now().toString(),
      userId: req.user.id,
      userName: req.user.name,
      action: 'ADMIN_DELETE_ROLE',
      timestamp: new Date().toISOString(),
      details: `Admin deleted role ${removed.name}`,
      ipAddress: req.ip,
      status: 'SUCCESS',
      riskLevel: 'MEDIUM'
    });

    res.json(removed);
  });

  app.post('/api/admin/users/:id/mfa', authenticateToken, (req: any, res) => {
    if (req.user.role !== 'ADMIN') return res.status(403).json({ message: 'Admin only' });
    const { id } = req.params;
    const { enabled } = req.body;
    const user = users.find(u => u.id === id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    user.mfaEnabled = !!enabled;

    auditLogs.push({
      id: Date.now().toString(),
      userId: req.user.id,
      userName: req.user.name,
      action: enabled ? 'ADMIN_ENABLE_MFA' : 'ADMIN_DISABLE_MFA',
      timestamp: new Date().toISOString(),
      details: `Admin ${enabled ? 'enabled' : 'disabled'} MFA for ${user.email}`,
      ipAddress: req.ip,
      status: 'SUCCESS',
      riskLevel: 'LOW'
    });

    res.json(user);
  });

  // --- WebSockets ---
  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('join_room', (room) => {
      socket.join(room);
    });

    socket.on('send_message', (data) => {
      const newMessage = {
        ...data,
        id: Date.now().toString(),
        timestamp: new Date().toISOString()
      };
      messages.push(newMessage);
      io.to(data.room).emit('receive_message', newMessage);
    });

    socket.on('disconnect', () => {
      console.log('User disconnected');
    });
  });

  // --- Vite Integration ---
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  const PORT = 3000;
  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Nexus Zero Trust Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
