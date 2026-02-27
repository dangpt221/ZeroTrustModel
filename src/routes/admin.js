import bcrypt from 'bcryptjs';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { User } from '../models/User.js';
import { Role } from '../models/Role.js';

export function registerAdminRoutes(router) {
  // ============= USERS API =============
  
  // Get all users (ADMIN only - full details)
  router.get('/admin/users', requireAuth, requireRole(['ADMIN']), async (_req, res, next) => {
    try {
      const users = await User.find().lean();
      res.json(
        users.map((u) => ({
          id: u._id.toString(),
          name: u.name,
          email: u.email,
          role: u.role,
          isLocked: u.isLocked,
          mfaEnabled: u.mfaEnabled,
          trustScore: u.trustScore ?? 95,
          departmentId: u.departmentId,
          createdAt: u.createdAt,
          updatedAt: u.updatedAt,
        })),
      );
    } catch (err) {
      next(err);
    }
  });

  // Get all users (any authenticated user - limited info)
  router.get('/users', requireAuth, async (_req, res, next) => {
    try {
      const users = await User.find().lean();
      res.json(
        users.map((u) => ({
          id: u._id.toString(),
          name: u.name,
          email: u.email,
          role: u.role,
          mfaEnabled: u.mfaEnabled,
          trustScore: u.trustScore ?? 95,
        })),
      );
    } catch (err) {
      next(err);
    }
  });

  // Get single user by ID
  router.get('/users/:id', requireAuth, async (req, res, next) => {
    try {
      const { id } = req.params;
      const user = await User.findById(id).lean();
      if (!user) return res.status(404).json({ message: 'User not found' });
      
      // Only ADMIN can see full details, others see limited
      const isAdmin = req.user.role === 'ADMIN';
      res.json({
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        mfaEnabled: isAdmin ? user.mfaEnabled : undefined,
        trustScore: user.trustScore ?? 95,
        departmentId: user.departmentId,
        isLocked: isAdmin ? user.isLocked : undefined,
      });
    } catch (err) {
      next(err);
    }
  });

  // Create new user (ADMIN only)
  router.post('/admin/users', requireAuth, requireRole(['ADMIN']), async (req, res, next) => {
    try {
      const { name, email, password, role, departmentId, mfaEnabled } = req.body;
      
      // Check if email already exists
      const existing = await User.findOne({ email });
      if (existing) {
        return res.status(400).json({ message: 'Email already exists' });
      }

      const plain = password || 'Password123!';
      const passwordHash = await bcrypt.hash(plain, 10);
      
      const user = await User.create({
        name,
        email,
        passwordHash,
        role: role || 'STAFF',
        departmentId,
        mfaEnabled: mfaEnabled || false,
        trustScore: 95,
        isLocked: false,
      });
      
      res.status(201).json({ 
        id: user._id.toString(),
        message: 'User created successfully' 
      });
    } catch (err) {
      next(err);
    }
  });

  // Update user (ADMIN only)
  router.put('/admin/users/:id', requireAuth, requireRole(['ADMIN']), async (req, res, next) => {
    try {
      const { id } = req.params;
      const { name, email, role, departmentId, trustScore, mfaEnabled, password } = req.body;

      const update = {};
      if (name) update.name = name;
      if (email) update.email = email;
      if (role) update.role = role;
      if (departmentId !== undefined) update.departmentId = departmentId;
      if (trustScore !== undefined) update.trustScore = trustScore;
      if (mfaEnabled !== undefined) update.mfaEnabled = mfaEnabled;
      if (password) {
        const bcrypt = require('bcryptjs');
        update.passwordHash = await bcrypt.hash(password, 10);
      }

      const user = await User.findByIdAndUpdate(id, update, { new: true });
      if (!user) return res.status(404).json({ message: 'User not found' });

      res.json({
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        mfaEnabled: user.mfaEnabled,
        message: 'User updated successfully'
      });
    } catch (err) {
      next(err);
    }
  });

  // Delete user (ADMIN only)
  router.delete('/admin/users/:id', requireAuth, requireRole(['ADMIN']), async (req, res, next) => {
    try {
      const { id } = req.params;
      
      // Prevent self-deletion
      if (id === req.user.id) {
        return res.status(400).json({ message: 'Cannot delete yourself' });
      }
      
      await User.findByIdAndDelete(id);
      res.json({ success: true, message: 'User deleted' });
    } catch (err) {
      next(err);
    }
  });

  // Lock/Unlock user (ADMIN only)
  router.post('/admin/users/:id/lock', requireAuth, requireRole(['ADMIN']), async (req, res, next) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const isLocked = status === 'LOCKED';
      
      await User.findByIdAndUpdate(id, { isLocked });
      res.json({ 
        success: true, 
        message: isLocked ? 'User locked' : 'User unlocked' 
      });
    } catch (err) {
      next(err);
    }
  });

  // Toggle MFA (ADMIN only)
  router.post('/admin/users/:id/mfa', requireAuth, requireRole(['ADMIN']), async (req, res, next) => {
    try {
      const { id } = req.params;
      const { enabled } = req.body;
      await User.findByIdAndUpdate(id, { mfaEnabled: !!enabled });
      res.json({ 
        success: true, 
        message: enabled ? 'MFA enabled' : 'MFA disabled' 
      });
    }catch (err) {
      next(err);
    }
  });

  // Reset password (ADMIN only)
  router.post('/admin/users/:id/reset-password', requireAuth, requireRole(['ADMIN']), async (req, res, next) => {
    try {
      const { id } = req.params;
      const { newPassword } = req.body;
      const plain = newPassword || 'Password123!';
      const passwordHash = await bcrypt.hash(plain, 10);
      
      await User.findByIdAndUpdate(id, { passwordHash });
      res.json({ success: true, message: 'Password reset successfully' });
    } catch (err) {
      next(err);
    }
  });

  // ============= ROLES API =============

  // Get all roles
  router.get('/admin/roles', requireAuth, requireRole(['ADMIN']), async (_req, res, next) => {
    try {
      const roles = await Role.find().lean();
      res.json(
        roles.map((r) => ({
          id: r._id.toString(),
          name: r.name,
          description: r.description,
          permissions: r.permissions || [],
          color: r.color,
        })),
      );
    } catch (err) {
      next(err);
    }
  });

  // Create role
  router.post('/admin/roles', requireAuth, requireRole(['ADMIN']), async (req, res, next) => {
    try {
      const { name, description, permissions, color }= req.body;
      const role = await Role.create({ 
        name, 
        description, 
        permissions: permissions || [],
        color: color || '#6366f1'
      });
      res.status(201).json({ id: role._id.toString() });
    } catch (err) {
      next(err);
    }
  });

  // Update role
  router.put('/admin/roles/:id', requireAuth, requireRole(['ADMIN']), async (req, res, next) => {
    try {
      const { id } = req.params;
      const role = await Role.findByIdAndUpdate(id, req.body, { new: true });
      res.json({ id: role._id.toString() });
    } catch (err) {
      next(err);
    }
  });

  // Delete role
  router.delete('/admin/roles/:id', requireAuth, requireRole(['ADMIN']), async (req, res, next) => {
    try {
      const { id } = req.params;
      await Role.findByIdAndDelete(id);
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  });

  // Get all permissions
  router.get('/admin/permissions', requireAuth, requireRole(['ADMIN']), async (_req, res) => {
    res.json([
      { id: 'USER_VIEW', name: 'View Users', code: 'USER_VIEW', description: 'View user list' },
      { id: 'USER_MANAGE', name: 'Manage Users', code: 'USER_MANAGE', description: 'Create, update, delete users' },
      { id: 'ROLE_MANAGE', name: 'Manage Roles', code: 'ROLE_MANAGE', description: 'Create, update, delete roles' },
      { id: 'DOCUMENT_VIEW', name: 'View Documents', code: 'DOCUMENT_VIEW', description: 'View documents' },
      { id: 'DOCUMENT_UPLOAD', name: 'Upload Documents', code: 'DOCUMENT_UPLOAD', description: 'Upload new documents' },
      { id: 'DOCUMENT_APPROVE', name: 'Approve Documents', code: 'DOCUMENT_APPROVE', description: 'Approve document requests' },
      { id: 'PROJECT_VIEW', name: 'View Projects', code: 'PROJECT_VIEW', description: 'View projects' },
      { id: 'PROJECT_MANAGE', name: 'Manage Projects', code: 'PROJECT_MANAGE', description: 'Create, update, delete projects' },
      { id: 'TEAM_MANAGE', name: 'Manage Teams', code: 'TEAM_MANAGE', description: 'Create, update, delete teams' },
      { id: 'AUDIT_VIEW', name: 'View Audit Logs', code: 'AUDIT_VIEW', description: 'View audit logs' },
      { id: 'ATTENDANCE_VIEW', name: 'View Attendance', code: 'ATTENDANCE_VIEW', description: 'View attendance records' },
      { id: 'ZERO_TRUST_CONFIG', name: 'Configure Zero Trust', code: 'ZERO_TRUST_CONFIG', description: 'Configure Zero Trust settings' },
    ]);
  });

  // ============= STATS API =============

  // Get dashboard stats
  router.get('/admin/stats', requireAuth, requireRole(['ADMIN', 'MANAGER']), async (_req, res, next) => {
    try {
      const totalUsers = await User.countDocuments();
      const activeUsers = await User.countDocuments({ isLocked: false });
      const lockedUsers = await User.countDocuments({ isLocked: true });
      const mfaEnabledUsers = await User.countDocuments({ mfaEnabled: true });

      res.json({
        totalUsers,
        activeUsers,
        lockedUsers,
        mfaEnabledUsers,
      });
    } catch (err) {
      next(err);
    }
  });
}
