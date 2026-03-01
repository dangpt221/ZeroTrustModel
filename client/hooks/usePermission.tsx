import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';

// Define permissions for each role based on requirements
const ROLE_PERMISSIONS: Record<string, string[]> = {
  SUPER_ADMIN: [
    // All permissions - full system access
    'USER_VIEW', 'USER_CREATE', 'USER_EDIT', 'USER_DELETE', 'USER_APPROVE', 'USER_LOCK',
    'ROLE_VIEW', 'ROLE_CREATE', 'ROLE_EDIT', 'ROLE_DELETE',
    'DEPT_VIEW', 'DEPT_CREATE', 'DEPT_EDIT', 'DEPT_DELETE',
    'PROJECT_VIEW', 'PROJECT_CREATE', 'PROJECT_EDIT', 'PROJECT_DELETE', 'PROJECT_ASSIGN',
    'DOC_VIEW', 'DOC_UPLOAD', 'DOC_EDIT', 'DOC_APPROVE', 'DOC_DELETE',
    'ATTENDANCE_VIEW', 'ATTENDANCE_MANAGE', 'ATTENDANCE_CHECKIN',
    'AUDIT_VIEW', 'AUDIT_EXPORT',
    'ZT_VIEW', 'ZT_MANAGE',
    'NOTIF_VIEW', 'NOTIF_SEND',
    'REPORT_VIEW', 'REPORT_EXPORT',
    // Chat Management - full access
    'CHAT_VIEW', 'CHAT_MANAGE', 'CHAT_DELETE', 'CHAT_EXPORT', 'CHAT_POLICY',
  ],
  ADMIN: [
    // User Management - full
    'USER_VIEW', 'USER_CREATE', 'USER_EDIT', 'USER_DELETE', 'USER_APPROVE', 'USER_LOCK',
    // Role Management - can manage but cannot delete SuperAdmin
    'ROLE_VIEW', 'ROLE_CREATE', 'ROLE_EDIT',
    // Department - full
    'DEPT_VIEW', 'DEPT_CREATE', 'DEPT_EDIT', 'DEPT_DELETE',
    // Project - full
    'PROJECT_VIEW', 'PROJECT_CREATE', 'PROJECT_EDIT', 'PROJECT_DELETE', 'PROJECT_ASSIGN',
    // Document - full
    'DOC_VIEW', 'DOC_UPLOAD', 'DOC_EDIT', 'DOC_APPROVE', 'DOC_DELETE',
    // Attendance - view & manage
    'ATTENDANCE_VIEW', 'ATTENDANCE_MANAGE',
    // Audit - view & export
    'AUDIT_VIEW', 'AUDIT_EXPORT',
    // Zero Trust - full
    'ZT_VIEW', 'ZT_MANAGE',
    // Notifications - view & send
    'NOTIF_VIEW', 'NOTIF_SEND',
    // Reports - view & export
    'REPORT_VIEW', 'REPORT_EXPORT',
    // Chat Management - full access
    'CHAT_VIEW', 'CHAT_MANAGE', 'CHAT_DELETE', 'CHAT_EXPORT', 'CHAT_POLICY',
  ],
  MANAGER: [
    // User - view team members only
    'USER_VIEW',
    // Role - view only
    'ROLE_VIEW',
    // Department - view only
    'DEPT_VIEW',
    // Project - create, edit, assign (within department)
    'PROJECT_VIEW', 'PROJECT_CREATE', 'PROJECT_EDIT', 'PROJECT_ASSIGN',
    // Document - view, upload, edit, approve (department level)
    'DOC_VIEW', 'DOC_UPLOAD', 'DOC_EDIT', 'DOC_APPROVE',
    // Attendance - view & manage team
    'ATTENDANCE_VIEW', 'ATTENDANCE_MANAGE',
    // Audit - view department logs
    'AUDIT_VIEW',
    // Zero Trust - view only
    'ZT_VIEW',
    // Notifications - view & send
    'NOTIF_VIEW', 'NOTIF_SEND',
    // Reports - view & export department reports
    'REPORT_VIEW', 'REPORT_EXPORT',
    // Chat Management - department level
    'CHAT_VIEW',
  ],
  STAFF: [
    // User - view self only
    'USER_VIEW',
    // Role - no access
    // Department - view
    'DEPT_VIEW',
    // Project - view assigned projects only
    'PROJECT_VIEW',
    // Document - view & upload own
    'DOC_VIEW', 'DOC_UPLOAD',
    // Attendance - check in/out & view own
    'ATTENDANCE_VIEW', 'ATTENDANCE_CHECKIN',
    // Audit - no access
    // Zero Trust - no access
    // Notifications - view
    'NOTIF_VIEW',
    // Reports - view own
    'REPORT_VIEW',
  ],
  AUDITOR: [
    // User - view only
    'USER_VIEW',
    // Role - view only
    'ROLE_VIEW',
    // Department - view
    'DEPT_VIEW',
    // Project - view
    'PROJECT_VIEW',
    // Document - view
    'DOC_VIEW',
    // Attendance - view
    'ATTENDANCE_VIEW',
    // Audit - view & export
    'AUDIT_VIEW', 'AUDIT_EXPORT',
    // Zero Trust - view
    'ZT_VIEW',
    // Notifications - view
    'NOTIF_VIEW',
    // Reports - view & export
    'REPORT_VIEW', 'REPORT_EXPORT',
    // Chat Management - read only
    'CHAT_VIEW', 'CHAT_EXPORT',
  ],
  MEMBER: [
    // Same as STAFF
    'USER_VIEW',
    'DEPT_VIEW',
    'PROJECT_VIEW',
    'DOC_VIEW', 'DOC_UPLOAD',
    'ATTENDANCE_VIEW', 'ATTENDANCE_CHECKIN',
    'NOTIF_VIEW',
    'REPORT_VIEW',
  ],
};

export function usePermission() {
  const { user } = useAuth();

  const role = (user?.role || 'MEMBER').toUpperCase();
  const permissions = ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.MEMBER;

  // SUPER_ADMIN has all permissions
  const hasPermission = (permission: string): boolean => {
    if (role === 'SUPER_ADMIN') return true;
    return permissions.includes(permission);
  };

  const hasAnyPermission = (permissionList: string[]): boolean => {
    if (role === 'SUPER_ADMIN') return true;
    return permissionList.some(p => permissions.includes(p));
  };

  const hasAllPermissions = (permissionList: string[]): boolean => {
    if (role === 'SUPER_ADMIN') return true;
    return permissionList.every(p => permissions.includes(p));
  };

  const isSuperAdmin = role === 'SUPER_ADMIN';
  const isAdmin = role === 'ADMIN';
  const isManager = role === 'MANAGER';
  const isAuditor = role === 'AUDITOR';
  const isStaff = role === 'STAFF' || role === 'MEMBER';

  return {
    role,
    permissions,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    isSuperAdmin,
    isAdmin,
    isManager,
    isAuditor,
    isStaff,
  };
}

// Helper component for conditional rendering based on permissions
import React from 'react';

interface PermissionGuardProps {
  permission?: string;
  permissions?: string[];
  requireAll?: boolean;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const PermissionGuard: React.FC<PermissionGuardProps> = ({
  permission,
  permissions,
  requireAll = false,
  children,
  fallback = null,
}) => {
  const { hasPermission, hasAnyPermission, hasAllPermissions } = usePermission();

  let allowed = false;

  if (permission) {
    allowed = hasPermission(permission);
  } else if (permissions) {
    allowed = requireAll
      ? hasAllPermissions(permissions)
      : hasAnyPermission(permissions);
  }

  if (!allowed) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};
