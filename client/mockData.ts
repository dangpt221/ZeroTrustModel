
import { User, UserRole, Project, ProjectStatus, Task, TaskStatus, Document, AuditLog, Comment, Department, Role, Permission } from './types';

export const MOCK_PERMISSIONS: Permission[] = [
  { id: 'p1', name: 'Xem báo cáo SOC', code: 'VIEW_SOC_REPORTS', description: 'Quyền xem log bảo mật hệ thống' },
  { id: 'p2', name: 'Quản lý User', code: 'MANAGE_USERS', description: 'Thêm, sửa, khóa tài khoản' },
  { id: 'p3', name: 'Phê duyệt tài liệu', code: 'APPROVE_DOCS', description: 'Quyền xem tài liệu mức độ High' },
  { id: 'p4', name: 'Cấu hình Zero Trust', code: 'CONFIG_ZERO_TRUST', description: 'Thay đổi chính sách bảo mật' },
];

export const MOCK_ROLES: Role[] = [
  { id: 'r1', name: 'Global Administrator', permissions: ['p1', 'p2', 'p3', 'p4'], color: 'bg-blue-600' },
  { id: 'r2', name: 'Security Manager', permissions: ['p1', 'p3', 'p4'], color: 'bg-rose-600' },
  { id: 'r3', name: 'Department Lead', permissions: ['p3'], color: 'bg-amber-600' },
  { id: 'r4', name: 'Regular Staff', permissions: [], color: 'bg-emerald-600' },
];

export const MOCK_DEPARTMENTS: Department[] = [
  { id: 'd1', name: 'Engineering', managerId: 'u2', memberCount: 156, description: 'Phát triển hạ tầng và phần mềm core' },
  { id: 'd2', name: 'Cyber Security', managerId: 'u1', memberCount: 24, description: 'Giám sát an ninh mạng và SOC' },
  { id: 'd3', name: 'Human Resources', managerId: 'u4', memberCount: 12, description: 'Quản lý nhân sự và chính sách nội bộ' },
];

export const MOCK_USERS: User[] = [
  {
    id: 'u1',
    name: 'Admin User',
    email: 'admin@nexus.com',
    role: UserRole.ADMIN,
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
    role: UserRole.MANAGER,
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
    role: UserRole.MEMBER,
    avatar: 'https://picsum.photos/seed/member/200',
    mfaEnabled: true, // Đã chuyển thành true để yêu cầu OTP khi đăng nhập
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
    role: UserRole.MEMBER,
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

export const MOCK_PROJECTS: Project[] = [
  {
    id: 'p1',
    title: 'Cloud Infrastructure Upgrade',
    description: 'Modernizing core server fleet to Kubernetes clusters.',
    status: ProjectStatus.IN_PROGRESS,
    progress: 65,
    startDate: '2024-01-10',
    endDate: '2024-08-15',
    managerId: 'u2',
    members: ['u1', 'u2', 'u3'],
    department: 'Engineering'
  },
  {
    id: 'p2',
    title: 'AI Customer Portal',
    description: 'Implementing LLM-based customer support chat.',
    status: ProjectStatus.PLANNING,
    progress: 15,
    startDate: '2024-04-01',
    endDate: '2024-12-20',
    managerId: 'u2',
    members: ['u2', 'u3'],
    department: 'Engineering'
  }
];

export const MOCK_TASKS: Task[] = [
  {
    id: 't1',
    projectId: 'p1',
    title: 'Setup EKS Cluster',
    description: 'Configure VPC and base Kubernetes control plane.',
    status: TaskStatus.DONE,
    assigneeId: 'u3',
    dueDate: '2024-02-01',
    priority: 'HIGH'
  }
];

export const MOCK_AUDIT_LOGS: AuditLog[] = [
  {
    id: 'l1',
    userId: 'u1',
    userName: 'Admin User',
    action: 'LOGIN_SUCCESS',
    timestamp: '2024-05-20T10:00:00Z',
    details: 'Authenticated via MFA',
    ipAddress: '192.168.1.105',
    status: 'SUCCESS',
    riskLevel: 'LOW'
  },
  {
    id: 'l2',
    userId: 'u4',
    userName: 'Suspicious User',
    action: 'LOGIN_FAILURE',
    timestamp: '2024-05-20T11:15:00Z',
    details: 'Invalid credentials from untrusted IP',
    ipAddress: '103.45.21.99',
    status: 'FAILURE',
    riskLevel: 'HIGH'
  }
];

export const MOCK_DOCS: Document[] = [
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
