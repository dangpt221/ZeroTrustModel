
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
import { StaffManagement } from './pages/Manager/StaffManagement';
import { DepartmentDocuments } from './pages/Manager/DepartmentDocuments';
import { ManagerReports } from './pages/Manager/ManagerReports';
import { ManagerApprovals } from './pages/Manager/ManagerApprovals';
import { TeamManagement } from './pages/TeamManagement';
import { StaffDashboard } from './pages/Staff/StaffDashboard';
import { StaffActivity } from './pages/Staff/StaffActivity';
import { StaffProfile } from './pages/Staff/StaffProfile';
import { Messaging } from './pages/Messaging';
import { Attendance } from './pages/Attendance';
import { ProjectDetail } from './pages/ProjectDetail';
import { AuditLogs } from './pages/AuditLogs';
import { UserRole } from './types';
import { NotificationManagement } from './pages/Admin/NotificationManagement';
import { PendingApproval } from './pages/PendingApproval';

const PrivateRoute: React.FC<{ children: React.ReactNode; roles?: UserRole[] }> = ({ children, roles }) => {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.status === 'PENDING') return <Navigate to="/pending-approval" replace />;
  if (roles && user && !roles.includes(user.role)) return <Navigate to="/" replace />;

  return <>{children}</>;
};

const DashboardSelector: React.FC = () => {
  const { user } = useAuth();
  if (user?.role === UserRole.ADMIN) return <AdminDashboard />;
  if (user?.role === UserRole.MANAGER) return <ManagerDashboard />;
  if (user?.role === UserRole.MEMBER) return <StaffDashboard />;
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
            <PrivateRoute roles={[UserRole.ADMIN]}>
              <Layout><UserManagement /></Layout>
            </PrivateRoute>
          } />

          <Route path="/admin/roles" element={
            <PrivateRoute roles={[UserRole.ADMIN]}>
              <Layout><RoleManagement /></Layout>
            </PrivateRoute>
          } />

          <Route path="/admin/departments" element={
            <PrivateRoute roles={[UserRole.ADMIN]}>
              <Layout><DepartmentManagement /></Layout>
            </PrivateRoute>
          } />

          <Route path="/admin/documents" element={
            <PrivateRoute roles={[UserRole.ADMIN]}>
              <Layout><DocumentManagement /></Layout>
            </PrivateRoute>
          } />

          <Route path="/admin/zero-trust" element={
            <PrivateRoute roles={[UserRole.ADMIN]}>
              <Layout><ZeroTrustSettings /></Layout>
            </PrivateRoute>
          } />

          <Route path="/admin/notifications" element={
            <PrivateRoute roles={[UserRole.ADMIN]}>
              <Layout><NotificationManagement /></Layout>
            </PrivateRoute>
          } />

          {/* Manager Specific Routes */}
          <Route path="/manager/staff" element={
            <PrivateRoute roles={[UserRole.MANAGER]}>
              <Layout><StaffManagement /></Layout>
            </PrivateRoute>
          } />

          <Route path="/manager/documents" element={
            <PrivateRoute roles={[UserRole.MANAGER]}>
              <Layout><DepartmentDocuments /></Layout>
            </PrivateRoute>
          } />

          <Route path="/manager/reports" element={
            <PrivateRoute roles={[UserRole.MANAGER]}>
              <Layout><ManagerReports /></Layout>
            </PrivateRoute>
          } />

          <Route path="/manager/approvals" element={
            <PrivateRoute roles={[UserRole.MANAGER]}>
              <Layout><ManagerApprovals /></Layout>
            </PrivateRoute>
          } />

          <Route path="/manager/teams" element={
            <PrivateRoute roles={[UserRole.MANAGER]}>
              <Layout><TeamManagement /></Layout>
            </PrivateRoute>
          } />

          {/* Member Specific Routes */}
          <Route path="/member/activity" element={
            <PrivateRoute roles={[UserRole.MEMBER]}>
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

          <Route path="/attendance" element={
            <PrivateRoute>
              <Layout><Attendance /></Layout>
            </PrivateRoute>
          } />

          <Route path="/projects/:id" element={
            <PrivateRoute>
              <Layout><ProjectDetail /></Layout>
            </PrivateRoute>
          } />

          <Route path="/audit-logs" element={
            <PrivateRoute roles={[UserRole.ADMIN]}>
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
  if (user?.role === UserRole.MEMBER) return <StaffProfile />;

  return (
    <div className="bg-white p-10 rounded-3xl border border-slate-100 shadow-sm max-w-4xl mx-auto">
      <div className="flex items-center gap-6 mb-10 pb-10 border-b border-slate-50">
        <img src={user?.avatar} className="w-24 h-24 rounded-3xl" />
        <div>
          <h2 className="text-3xl font-black text-slate-800">{user?.name}</h2>
          <p className="text-slate-400 font-medium">{user?.role} Profile</p>
        </div>
      </div>
      <p className="text-slate-500 italic">Giao diện hồ sơ Admin/Manager đang được đồng bộ...</p>
    </div>
  );
}

export default App;
