import { requireAuth, requireRole } from '../middleware/auth.js';
import { Department } from '../models/Department.js';
import { User } from '../models/User.js';

export function registerDepartmentRoutes(router) {
  // Get all departments
  router.get('/departments', requireAuth, async (_req, res, next) => {
    try {
      const depts = await Department.find().lean();
      const deptsWithCount = await Promise.all(
        depts.map(async (d) => {
          const memberCount = await User.countDocuments({ departmentId: d._id });
          return {
            id: d._id.toString(),
            name: d.name,
            description: d.description,
            managerId: d.managerId,
            memberCount,
          };
        })
      );
      res.json(deptsWithCount);
    } catch (err) {
      next(err);
    }
  });

  // Get single department
  router.get('/departments/:id', requireAuth, async (req, res, next) => {
    try {
      const { id }= req.params;
      const dept = await Department.findById(id).lean();
      if (!dept) return res.status(404).json({ message: 'Department not found' });
      const memberCount = await User.countDocuments({ departmentId: id });
      res.json({ id: dept._id.toString(), name: dept.name, description: dept.description, managerId: dept.managerId, memberCount });
    } catch (err) {
      next(err);
    }
  });

  // Create department
  router.post('/departments', requireAuth, requireRole(['ADMIN']), async (req, res, next) => {
    try {
      const { name, description, managerId } = req.body;
      const dept = await Department.create({ name, description, managerId });
      res.status(201).json({ id: dept._id.toString() });
    } catch (err) {
      next(err);
    }
  });

  // Update department
  router.put('/departments/:id', requireAuth, requireRole(['ADMIN']), async (req, res, next) => {
    try {
      const { id } = req.params;
      const dept = await Department.findByIdAndUpdate(id, req.body, { new: true });
      res.json({ id: dept._id.toString() });
    } catch (err) {
      next(err);
    }
  });

  // Delete department
  router.delete('/departments/:id', requireAuth, requireRole(['ADMIN']), async (req, res, next) => {
    try {
      const { id } = req.params;
      await Department.findByIdAndDelete(id);
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  });
}

