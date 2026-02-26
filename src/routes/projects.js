import { requireAuth, requireRole } from '../middleware/auth.js';
import { Project } from '../models/Project.js';
import { Task } from '../models/Task.js';
import { User } from '../models/User.js';

export function registerProjectRoutes(router) {
  // Get all projects
  router.get('/projects', requireAuth, async (_req, res, next) => {
    try {
      const projects = await Project.find().lean();
      res.json(
        projects.map((p) => ({
          id: p._id.toString(),
          name: p.name,
          description: p.description,
          status: p.status,
          progress: p.progress || 0,
          startDate: p.startDate,
          endDate: p.endDate,
          managerId: p.managerId,
          departmentId: p.departmentId,
          memberCount: p.members?.length || 0,
        })),
      );
    } catch (err) {
      next(err);
    }
  });

  // Get single project by ID
  router.get('/projects/:id', requireAuth, async (req, res, next) => {
    try {
      const { id } = req.params;
      const project = await Project.findById(id).lean();
      if (!project) return res.status(404).json({ message: 'Project not found' });

      // Get manager info
      const manager = await User.findById(project.managerId).lean();

      res.json({
        id: project._id.toString(),
        name: project.name,
        description: project.description,
        status: project.status,
        progress: project.progress || 0,
        startDate: project.startDate,
        endDate: project.endDate,
        managerId: project.managerId,
        managerName: manager?.name,
        departmentId: project.departmentId,
        members: project.members || [],
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
      });
    } catch (err) {
      next(err);
    }
  });

  // Create new project
  router.post('/projects', requireAuth, requireRole(['ADMIN', 'MANAGER']), async (req, res, next) => {
    try {
      const { name, description, status, startDate, endDate, managerId, departmentId } = req.body;
      
      const project = await Project.create({
        name,
        description,
        status: status || 'PLANNING',
        progress: 0,
        startDate,
        endDate,
        managerId: managerId || req.user.id,
        departmentId,
        members: [],
      });
      
      res.status(201).json({ 
        id: project._id.toString(),
        message: 'Project created successfully' 
      });
    } catch (err) {
      next(err);
    }
  });

  // Update project
  router.put('/projects/:id', requireAuth, requireRole(['ADMIN', 'MANAGER']), async (req, res, next) => {
    try {
      const { id } = req.params;
      const { name, description, status, progress, startDate, endDate, departmentId } = req.body;
      
      const update = {};
      if (name) update.name = name;
      if (description !== undefined) update.description = description;
      if (status) update.status = status;
      if (progress !== undefined) update.progress = progress;
      if (startDate) update.startDate = startDate;
      if (endDate) update.endDate = endDate;
      if (departmentId !== undefined) update.departmentId = departmentId;

      const project = await Project.findByIdAndUpdate(id, update, { new: true });
      if (!project) return res.status(404).json({ message: 'Project not found' });
      
      res.json({ 
        id: project._id.toString(),
        message: 'Project updated successfully' 
      });
    } catch (err) {
      next(err);
    }
  });

  // Delete project
  router.delete('/projects/:id', requireAuth, requireRole(['ADMIN']), async (req, res, next) => {
    try {
      const { id } = req.params;
      await Project.findByIdAndDelete(id);
      // Also delete all tasks related to this project
      await Task.deleteMany({ projectId: id });
      res.json({ success: true, message: 'Project deleted' });
    } catch (err) {
      next(err);
    }
  });

  // Add member to project
  router.post('/projects/:id/members', requireAuth, requireRole(['ADMIN', 'MANAGER']), async (req, res, next) => {
    try {
      const { id } = req.params;
      const { userId } = req.body;
      
      const project = await Project.findByIdAndUpdate(
        id,
        { $addToSet: { members: userId } },
        { new: true }
      );
      
      if (!project) return res.status(404).json({ message: 'Project not found' });
      res.json({ success: true, members: project.members });
    } catch (err) {
      next(err);
    }
  });

  // Remove member from project
  router.delete('/projects/:id/members/:userId', requireAuth, requireRole(['ADMIN', 'MANAGER']), async (req, res, next) => {
    try {
      const { id, userId } = req.params;
      
      const project = await Project.findByIdAndUpdate(
        id,
        { $pull: { members: userId } },
        { new: true }
      );
      
      if (!project) return res.status(404).json({ message: 'Project not found' });
      res.json({ success: true, members: project.members });
    } catch (err) {
      next(err);
    }
  });

  // ============= TASKS API =============

  // Get all tasks for a project
  router.get('/projects/:projectId/tasks', requireAuth, async (req, res, next) => {
    try {
      const { projectId } = req.params;
      const tasks = await Task.find({ projectId }).lean();
      res.json(
        tasks.map((t) => ({
          id: t._id.toString(),
          title: t.title,
          description: t.description,
          status: t.status,
          priority: t.priority,
          assigneeId: t.assigneeId,
          dueDate: t.dueDate,
          projectId: t.projectId,
          createdAt: t.createdAt,
          updatedAt: t.updatedAt,
        })),
      );
    } catch (err) {
      next(err);
    }
  });

  // Get single task
  router.get('/tasks/:id', requireAuth, async (req, res, next) => {
    try {
      const { id } = req.params;
      const task = await Task.findById(id).lean();
      if (!task) return res.status(404).json({ message: 'Task not found' });
      res.json({
        id: task._id.toString(),
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        assigneeId: task.assigneeId,
        dueDate: task.dueDate,
        projectId: task.projectId,
      });
    } catch (err) {
      next(err);
    }
  });

  // Create task
  router.post('/projects/:projectId/tasks', requireAuth, requireRole(['ADMIN', 'MANAGER']), async (req, res, next) => {
    try {
      const { projectId } = req.params;
      const { title, description, status, priority, assigneeId, dueDate } = req.body;
      
      const task = await Task.create({
        projectId,
        title,
        description,
        status: status || 'TODO',
        priority: priority || 'MEDIUM',
        assigneeId,
        dueDate,
      });
      
      res.status(201).json({ id: task._id.toString() });
    } catch (err) {
      next(err);
    }
  });

  // Update task
  router.put('/tasks/:id', requireAuth, async (req, res, next) => {
    try {
      const { id } = req.params;
      const { title, description, status, priority, assigneeId, dueDate } = req.body;
      
      const update = {};
      if (title) update.title = title;
      if (description !== undefined) update.description = description;
      if (status) update.status = status;
      if (priority) update.priority = priority;
      if (assigneeId !== undefined) update.assigneeId = assigneeId;
      if (dueDate !== undefined) update.dueDate = dueDate;

      const task = await Task.findByIdAndUpdate(id, update, { new: true });
      if (!task) return res.status(404).json({ message: 'Task not found' });
      
      res.json({ id: task._id.toString() });
    } catch (err) {
      next(err);
    }
  });

  // Delete task
  router.delete('/tasks/:id', requireAuth, requireRole(['ADMIN', 'MANAGER']), async (req, res, next) => {
    try {
      const { id } = req.params;
      await Task.findByIdAndDelete(id);
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  });
}
