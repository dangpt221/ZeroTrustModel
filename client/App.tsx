
import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { AdminDashboard } from './pages/AdminDashboard';
import { UserManagement } from './pages/Admin/UserManagement';
import { RoleManagement } from './pages/Admin/RoleManagement';
import { DepartmentManagement } from './pages/Admin/DepartmentManagement';
import { DocumentManagement } from './pages/Admin/DocumentManagement';
import { ZeroTrustSettings } from './pages/Admin/ZeroTrustSettings';
import { ManagerDashboard } from './pages/Manager/ManagerDashboard';
import { ManagerProfile } from './pages/Manager/ManagerProfile';
import { StaffManagement } from './pages/Manager/StaffManagement';
import { DepartmentDocuments } from './pages/Manager/DepartmentDocuments';
import { TeamManagement } from './pages/TeamManagement';
import { StaffDashboard } from './pages/Staff/StaffDashboard';
import { StaffActivity } from './pages/Staff/StaffActivity';
import { StaffProfile } from './pages/Staff/StaffProfile';
import { Messaging } from './pages/Messaging';
import { ProjectDetail } from './pages/ProjectDetail';
import { AuditLogs } from './pages/AuditLogs';
import { UserRole } from './types';
import { NotificationManagement } from './pages/Admin/NotificationManagement';
import { PendingApproval } from './pages/PendingApproval';
import { ChatManagement } from './pages/Admin/ChatManagement';

const PrivateRoute: React.FC<{ children: React.ReactNode; roles?: UserRole[], permissions?: string[] }> = ({ children, roles, permissions }) => {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.status === 'PENDING') return <Navigate to="/pending-approval" replace />;
  
  if (user?.role === UserRole.ADMIN) return <>{children}</>;

  if (roles && user && !roles.includes(user.role as UserRole)) {
    // If the base roles don't match, check if they have specific permissions
    if (permissions && user.permissions && permissions.some(p => user.permissions?.includes(p))) {
      return <>{children}</>;
    }
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

const DashboardSelector: React.FC = () => {
  const { user } = useAuth();
  if (user?.role === UserRole.ADMIN) return <AdminDashboard />;
  if (user?.role === UserRole.MANAGER) return <ManagerDashboard />;
  if (user?.role === UserRole.STAFF) return <StaffDashboard />;
  return <div className="p-10 text-center text-slate-400">Giao diện đang phát triển...</div>;
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/pending-approval" element={<PendingApproval />} />

          <Route path="/" element={
            <PrivateRoute>
              <Layout><DashboardSelector /></Layout>
            </PrivateRoute>
          } />

          {/* Admin Routes */}
          <Route path="/admin/users" element={
            <PrivateRoute roles={[UserRole.ADMIN]} permissions={['USER_VIEW']}>
              <Layout><UserManagement /></Layout>
            </PrivateRoute>
          } />

          <Route path="/admin/roles" element={
            <PrivateRoute roles={[UserRole.ADMIN]} permissions={['ROLE_VIEW', 'USER_VIEW']}>
              <Layout><RoleManagement /></Layout>
            </PrivateRoute>
          } />

          <Route path="/admin/departments" element={
            <PrivateRoute roles={[UserRole.ADMIN]} permissions={['DEPT_VIEW']}>
              <Layout><DepartmentManagement /></Layout>
            </PrivateRoute>
          } />

          <Route path="/admin/documents" element={
            <PrivateRoute roles={[UserRole.ADMIN]} permissions={['DOC_VIEW']}>
              <Layout><DocumentManagement /></Layout>
            </PrivateRoute>
          } />

          <Route path="/admin/zero-trust" element={
            <PrivateRoute roles={[UserRole.ADMIN]} permissions={['ZT_VIEW']}>
              <Layout><ZeroTrustSettings /></Layout>
            </PrivateRoute>
          } />

          <Route path="/admin/notifications" element={
            <PrivateRoute roles={[UserRole.ADMIN]} permissions={['NOTIF_SEND']}>
              <Layout><NotificationManagement /></Layout>
            </PrivateRoute>
          } />

          <Route path="/admin/chat" element={
            <PrivateRoute roles={[UserRole.ADMIN]} permissions={['ROLE_VIEW']}>
              <Layout><ChatManagement /></Layout>
            </PrivateRoute>
          } />

          {/* Manager Specific Routes (Admin can also access) */}
          <Route path="/manager/staff" element={
            <PrivateRoute roles={[UserRole.ADMIN, UserRole.MANAGER]}>
              <Layout><StaffManagement /></Layout>
            </PrivateRoute>
          } />

          <Route path="/manager/profile" element={
            <PrivateRoute roles={[UserRole.MANAGER]}>
              <Layout><ManagerProfile /></Layout>
            </PrivateRoute>
          } />

          <Route path="/manager/documents" element={
            <PrivateRoute roles={[UserRole.ADMIN, UserRole.MANAGER]}>
              <Layout><DepartmentDocuments /></Layout>
            </PrivateRoute>
          } />

          <Route path="/manager/teams" element={
            <PrivateRoute roles={[UserRole.ADMIN, UserRole.MANAGER]}>
              <Layout><TeamManagement /></Layout>
            </PrivateRoute>
          } />

          {/* Member Specific Routes */}
          <Route path="/member/activity" element={
            <PrivateRoute roles={[UserRole.STAFF]}>
              <Layout><StaffActivity /></Layout>
            </PrivateRoute>
          } />

          <Route path="/profile" element={
            <PrivateRoute>
              <Layout>
                <DashboardSelectorProfileWrapper />
              </Layout>
            </PrivateRoute>
          } />

          <Route path="/messaging" element={
            <PrivateRoute>
              <Layout><Messaging /></Layout>
            </PrivateRoute>
          } />
          <Route path="/projects/:id" element={
            <PrivateRoute>
              <Layout><ProjectDetail /></Layout>
            </PrivateRoute>
          } />

          <Route path="/audit-logs" element={
            <PrivateRoute roles={[UserRole.ADMIN]} permissions={['AUDIT_VIEW']}>
              <Layout><AuditLogs /></Layout>
            </PrivateRoute>
          } />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
};

const DashboardSelectorProfileWrapper: React.FC = () => {
  const { user } = useAuth();
  
  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Premium Profile Header */}
      <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm flex items-center gap-6 animate-in fade-in slide-in-from-top-4 duration-700">
        <div className="relative">
          <img src={user?.avatar} className="w-24 h-24 rounded-3xl object-cover ring-4 ring-blue-50" alt="Avatar" />
          <div className="absolute -bottom-2 -right-2 bg-emerald-500 w-6 h-6 rounded-full border-4 border-white flex items-center justify-center">
            <div className="w-2 h-2 bg-white rounded-full animate-ping"></div>
          </div>
        </div>
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">{user?.name}</h2>
          <p className="text-blue-600 font-bold uppercase tracking-widest text-xs mt-1 bg-blue-50 inline-block px-3 py-1 rounded-lg">
            {user?.role} Profile
          </p>
        </div>
      </div>

      {user?.role === UserRole.STAFF ? <StaffProfile /> : <ManagerProfile />}
    </div>
  );
}

export default App;
