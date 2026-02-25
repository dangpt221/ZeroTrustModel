import bcrypt from 'bcryptjs';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { User } from '../models/User.js';
import { Role } from '../models/Role.js';

export function registerAdminRoutes(router) {
  // Users CRUD
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
        })),
      );
    } catch (err) {
      next(err);
    }
  });

  router.post('/admin/users', requireAuth, requireRole(['ADMIN']), async (req, res, next) => {
    try {
      const { name, email, password, role } = req.body;
      const plain = password || 'Admin123!';
      const passwordHash = await bcrypt.hash(plain, 10);
      const user = await User.create({
        name,
        email,
        passwordHash,
        role: role || 'STAFF',
      });
      res.status(201).json({ id: user._id.toString() });
    } catch (err) {
      next(err);
    }
  });

  router.put('/admin/users/:id', requireAuth, requireRole(['ADMIN']), async (req, res, next) => {
    try {
      const { id } = req.params;
      const update = { ...req.body };
      delete update.password;
      const user = await User.findByIdAndUpdate(id, update, { new: true });
      res.json({ id: user._id.toString() });
    } catch (err) {
      next(err);
    }
  });

  router.delete('/admin/users/:id', requireAuth, requireRole(['ADMIN']), async (req, res, next) => {
    try {
      const { id } = req.params;
      await User.findByIdAndDelete(id);
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  });

  router.post('/admin/users/:id/lock', requireAuth, requireRole(['ADMIN']), async (req, res, next) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const isLocked = status === 'LOCKED';
      await User.findByIdAndUpdate(id, { isLocked });
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  });

  router.post('/admin/users/:id/mfa', requireAuth, requireRole(['ADMIN']), async (req, res, next) => {
    try {
      const { id } = req.params;
      const { enabled } = req.body;
      await User.findByIdAndUpdate(id, { mfaEnabled: !!enabled });
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  });

  router.get('/users', requireAuth, async (_req, res, next) => {
    try {
      const users = await User.find().lean();
      res.json(
        users.map((u) => ({
          id: u._id.toString(),
          name: u.name,
          email: u.email,
          role: u.role,
        })),
      );
    } catch (err) {
      next(err);
    }
  });

  // Roles & permissions
  router.get('/admin/roles', requireAuth, requireRole(['ADMIN']), async (_req, res, next) => {
    try {
      const roles = await Role.find().lean();
      res.json(
        roles.map((r) => ({
          id: r._id.toString(),
          name: r.name,
          description: r.description,
          permissions: r.permissions || [],
        })),
      );
    } catch (err) {
      next(err);
    }
  });

  router.post('/admin/roles', requireAuth, requireRole(['ADMIN']), async (req, res, next) => {
    try {
      const { name, description, permissions } = req.body;
      const role = await Role.create({ name, description, permissions: permissions || [] });
      res.status(201).json({ id: role._id.toString() });
    } catch (err) {
      next(err);
    }
  });

  router.put('/admin/roles/:id', requireAuth, requireRole(['ADMIN']), async (req, res, next) => {
    try {
      const { id } = req.params;
      const role = await Role.findByIdAndUpdate(id, req.body, { new: true });
      res.json({ id: role._id.toString() });
    } catch (err) {
      next(err);
    }
  });

  router.delete('/admin/roles/:id', requireAuth, requireRole(['ADMIN']), async (req, res, next) => {
    try {
      const { id } = req.params;
      await Role.findByIdAndDelete(id);
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  });

  router.get('/admin/permissions', requireAuth, requireRole(['ADMIN']), async (_req, res) => {
    res.json([
      'USER_MANAGE',
      'ROLE_MANAGE',
      'DOCUMENT_APPROVE',
      'PROJECT_MANAGE',
      'TEAM_MANAGE',
      'AUDIT_VIEW',
      'ATTENDANCE_VIEW',
    ]);
  });
}

