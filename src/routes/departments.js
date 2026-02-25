import { requireAuth, requireRole } from '../middleware/auth.js';
import { Department } from '../models/Department.js';

export function registerDepartmentRoutes(router) {
  router.get('/departments', requireAuth, async (_req, res, next) => {
    try {
      const depts = await Department.find().lean();
      res.json(
        depts.map((d) => ({
          id: d._id.toString(),
          name: d.name,
          description: d.description,
        })),
      );
    } catch (err) {
      next(err);
    }
  });

  router.post('/departments', requireAuth, requireRole(['ADMIN']), async (req, res, next) => {
    try {
      const { name, description } = req.body;
      const dept = await Department.create({ name, description });
      res.status(201).json({ id: dept._id.toString() });
    } catch (err) {
      next(err);
    }
  });

  router.put('/departments/:id', requireAuth, requireRole(['ADMIN']), async (req, res, next) => {
    try {
      const { id } = req.params;
      const dept = await Department.findByIdAndUpdate(id, req.body, { new: true });
      res.json({ id: dept._id.toString() });
    } catch (err) {
      next(err);
    }
  });
}

