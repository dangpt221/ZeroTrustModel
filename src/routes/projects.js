import { requireAuth } from '../middleware/auth.js';
import { Project } from '../models/Project.js';
import { Task } from '../models/Task.js';

export function registerProjectRoutes(router) {
  router.get('/projects', requireAuth, async (_req, res, next) => {
    try {
      const projects = await Project.find().lean();
      res.json(
        projects.map((p) => ({
          id: p._id.toString(),
          name: p.name,
          description: p.description,
          status: p.status,
        })),
      );
    } catch (err) {
      next(err);
    }
  });

  router.get('/projects/:id', requireAuth, async (req, res, next) => {
    try {
      const { id } = req.params;
      const project = await Project.findById(id).lean();
      if (!project) return res.status(404).json({ message: 'Not found' });
      res.json({
        id: project._id.toString(),
        name: project.name,
        description: project.description,
        status: project.status,
      });
    } catch (err) {
      next(err);
    }
  });

  router.post('/projects', requireAuth, async (req, res, next) => {
    try {
      const { name, description, status } = req.body;
      const project = await Project.create({
        name,
        description,
        status,
      });
      res.status(201).json({ id: project._id.toString() });
    } catch (err) {
      next(err);
    }
  });

  router.put('/projects/:id', requireAuth, async (req, res, next) => {
    try {
      const { id } = req.params;
      const project = await Project.findByIdAndUpdate(id, req.body, {
        new: true,
      });
      res.json({ id: project._id.toString() });
    } catch (err) {
      next(err);
    }
  });

  router.get('/projects/:projectId/tasks', requireAuth, async (req, res, next) => {
    try {
      const { projectId } = req.params;
      const tasks = await Task.find({ projectId }).lean();
      res.json(
        tasks.map((t) => ({
          id: t._id.toString(),
          title: t.title,
          status: t.status,
          projectId: t.projectId,
        })),
      );
    } catch (err) {
      next(err);
    }
  });

  router.post('/projects/:projectId/tasks', requireAuth, async (req, res, next) => {
    try {
      const { projectId } = req.params;
      const { title, status } = req.body;
      const task = await Task.create({
        projectId,
        title,
        status,
      });
      res.status(201).json({ id: task._id.toString() });
    } catch (err) {
      next(err);
    }
  });

  router.put('/tasks/:taskId', requireAuth, async (req, res, next) => {
    try {
      const { taskId } = req.params;
      const task = await Task.findByIdAndUpdate(taskId, req.body, { new: true });
      res.json({ id: task._id.toString() });
    } catch (err) {
      next(err);
    }
  });
}

