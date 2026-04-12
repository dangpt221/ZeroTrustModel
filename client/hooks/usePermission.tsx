import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';

// Define permissions for each role based on requirements
const ROLE_PERMISSIONS: Record<string, string[]> = {

  ADMIN: [
    // User Management - full
    'USER_VIEW', 'USER_CREATE', 'USER_EDIT', 'USER_DELETE', 'USER_APPROVE', 'USER_LOCK',
    // Role Management - can manage but cannot delete SuperAdmin
    'ROLE_VIEW', 'ROLE_MANAGE',
    // Department - full
    'DEPT_CREATE', 'DEPT_EDIT', 'DEPT_DELETE',
    // Document - full
    'DOC_VIEW', 'DOC_UPLOAD', 'DOC_EDIT', 'DOC_APPROVE', 'DOC_DELETE',
    // Zero Trust - full
    'ZT_VIEW', 'ZT_MANAGE',
    // Notifications - view & send
    'NOTIF_SEND',
    // Chat Management - full access
    'CHAT_VIEW', 'CHAT_MANAGE', 'CHAT_DELETE', 'CHAT_EXPORT', 'CHAT_POLICY',
  ],
  MANAGER: [
    // User - view team members only
    'USER_VIEW',
    // Role - view only
    'ROLE_VIEW',
    // Document - view, upload, edit, approve (department level)
    'DOC_VIEW', 'DOC_UPLOAD', 'DOC_EDIT', 'DOC_APPROVE',
    // Zero Trust - view only
    'ZT_VIEW',
    // Notifications - view & send
    'NOTIF_SEND',
    // Chat Management - department level
    'CHAT_VIEW',
  ],
  STAFF: [
    // User - view self only
    'USER_VIEW',
    // Role - no access
    // Document - view & upload own
    'DOC_VIEW', 'DOC_UPLOAD',
    // Zero Trust - no access
    // Chat Management - no access
  ],

};

export function usePermission() {
  const { user } = useAuth();

  const role = (user?.role || 'STAFF').toUpperCase();
  const permissions = ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.STAFF;

  const hasPermission = (permission: string): boolean => {
    return permissions.includes(permission);
  };

  const hasAnyPermission = (permissionList: string[]): boolean => {
    return permissionList.some(p => permissions.includes(p));
  };

  const hasAllPermissions = (permissionList: string[]): boolean => {
    return permissionList.every(p => permissions.includes(p));
  };

  const isSuperAdmin = false;
  const isAdmin = role === 'ADMIN';
  const isManager = role === 'MANAGER';
  const isAuditor = false;
  const isStaff = role === 'STAFF';

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
