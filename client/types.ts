// User types
export enum UserRole {
  SUPER_ADMIN = "SUPER_ADMIN",
  ADMIN = "ADMIN",
  MANAGER = "MANAGER",
  STAFF = "STAFF",
  MEMBER = "MEMBER",
  AUDITOR = "AUDITOR"
}

export enum UserStatus {
  ACTIVE = "ACTIVE",
  LOCKED = "LOCKED",
  PENDING = "PENDING"
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole | string;
  status: UserStatus | string;
  avatar: string;
  department?: string;
  departmentId?: string;
  trustScore: number;
  device: string;
  mfaEnabled: boolean;
  googleId?: string;
  isLocked?: boolean;
  knownDevices?: string[];
  lastActiveAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

// Project types
export enum ProjectStatus {
  IN_PROGRESS = "IN_PROGRESS",
  COMPLETED = "COMPLETED",
  ON_HOLD = "ON_HOLD",
  NOT_STARTED = "NOT_STARTED",
  CANCELLED = "CANCELLED"
}

export enum TaskStatus {
  TODO = "TODO",
  IN_PROGRESS = "IN_PROGRESS",
  REVIEW = "REVIEW",
  DONE = "DONE"
}

export interface Project {
  id: string;
  title: string;
  description?: string;
  status: ProjectStatus | string;
  progress: number;
  department?: string;
  departmentId?: string;
  managerId?: string;
  manager?: string;
  members: string[];
  startDate?: string;
  endDate?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus | string;
  projectId: string;
  assignedTo?: string;
  assignedToName?: string;
  dueDate?: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH';
  createdAt?: string;
  updatedAt?: string;
}

// Department
export interface Department {
  id: string;
  name: string;
  description?: string;
  headId?: string;
  head?: string;
  memberCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

// Team
export interface Team {
  id: string;
  name: string;
  description?: string;
  leaderId?: string;
  leader?: string;
  memberIds: string[];
  members?: User[];
  departmentId?: string;
  createdAt?: string;
  updatedAt?: string;
}

// Document
export enum DocumentType {
  PDF = "PDF",
  WORD = "WORD",
  EXCEL = "EXCEL",
  IMAGE = "IMAGE",
  OTHER = "OTHER"
}

export enum DocumentStatus {
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED"
}

export interface Document {
  id: string;
  title: string;
  description?: string;
  departmentId?: string;
  departmentName?: string;
  projectId?: string;
  projectTitle?: string;
  ownerId?: string;
  ownerName?: string;
  classification?: 'PUBLIC' | 'INTERNAL' | 'CONFIDENTIAL' | string;
  securityLevel?: number;
  sensitivity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | string;
  currentVersion?: number;
  fileSize?: string;
  fileType?: string;
  url?: string;
  status?: 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED' | string;
  approvedBy?: string;
  approvedAt?: string;
  rejectionReason?: string;
  tags?: string[];
  viewedBy?: string[];
  downloadedBy?: string[];
  lastViewedAt?: string;
  lastDownloadedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  // Legacy fields for compatibility
  type?: DocumentType | string;
  uploadedBy?: string;
}

export interface DocumentRequest {
  id: string;
  title: string;
  description?: string;
  type: DocumentType | string;
  status: DocumentStatus | string;
  requesterId: string;
  requesterName?: string;
  departmentId?: string;
  createdAt?: string;
  updatedAt?: string;
}

// Attendance
export enum AttendanceType {
  CHECK_IN = "CHECK_IN",
  CHECK_OUT = "CHECK_OUT"
}

export interface Attendance {
  id: string;
  type: AttendanceType | string;
  timestamp: string;
  location: string;
  device: string;
  userId: string;
  createdAt?: string;
}

// Message
export interface Message {
  id: string;
  userId: string;
  userName: string;
  text: string;
  room: string;
  timestamp: string;
}

// Notification
export enum NotificationType {
  INFO = "INFO",
  SUCCESS = "SUCCESS",
  WARNING = "WARNING",
  ERROR = "ERROR",
  SYSTEM = "SYSTEM"
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: NotificationType | string;
  read: boolean;
  userId?: string;
  createdAt: string;
}

// Audit Log
export enum AuditLogStatus {
  SUCCESS = "SUCCESS",
  FAILED = "FAILED",
  PENDING = "PENDING"
}

export enum RiskLevel {
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH",
  CRITICAL = "CRITICAL"
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  details?: string;
  ipAddress: string;
  timestamp: string;
  status: AuditLogStatus | string;
  riskLevel: RiskLevel | string;
}

// Role
export interface Permission {
  id: string;
  name: string;
  code: string;
  description?: string;
  category?: string;
}

export interface Role {
  id: string;
  name: string;
  description?: string;
  permissions: Permission[] | string[];
  color?: string;
  isActive?: boolean;
  isSystem?: boolean;
  userCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

// Zero Trust Config
export interface ZeroTrustConfig {
  id: string;
  mfaRequired: boolean;
  mfaRequiredForAdmins: boolean;
  maxLoginFails: number;
  trustScoreThreshold: number;
  allowExternalIP: boolean;
  alertOnNewDevice: boolean;
  ipWhitelist: string[];
  deviceTrustThreshold: number;
  geofencingEnabled: boolean;
}
