
export enum UserRole {
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  MEMBER = 'MEMBER'
}

export interface Permission {
  id: string;
  name: string;
  code: string;
  description: string;
}

export interface Role {
  id: string;
  name: string;
  description?: string;
  permissions: string[]; // Permission IDs
  color: string;
}

export interface Department {
  id: string;
  name: string;
  managerId: string;
  memberCount: number;
  description: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar: string;
  mfaEnabled: boolean;
  department: string;
  lastLogin: string;
  trustScore: number;
  ipAddress: string;
  device: string;
  status: 'ACTIVE' | 'LOCKED' | 'PENDING';
}

export enum ProjectStatus {
  PLANNING = 'PLANNING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  ON_HOLD = 'ON_HOLD'
}

export interface Project {
  id: string;
  title: string;
  description: string;
  status: ProjectStatus;
  progress: number;
  startDate: string;
  endDate: string;
  managerId: string;
  members: string[];
  department: string;
}

export enum TaskStatus {
  TODO = 'TODO',
  IN_PROGRESS = 'IN_PROGRESS',
  REVIEW = 'REVIEW',
  DONE = 'DONE'
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description: string;
  status: TaskStatus;
  assigneeId: string;
  dueDate: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface Document {
  id: string;
  projectId: string;
  name: string;
  type: string;
  size: string;
  uploadedBy: string;
  uploadedAt: string;
  url: string;
  sensitivity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  department: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  timestamp: string;
  details: string;
  ipAddress: string;
  status: 'SUCCESS' | 'WARNING' | 'FAILURE';
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface Comment {
  id: string;
  targetId: string;
  userId: string;
  userName: string;
  text: string;
  timestamp: string;
}

export interface Team {
  id: string;
  name: string;
  managerId: string;
  members: string[]; // User IDs
  description: string;
  createdAt: string;
}
