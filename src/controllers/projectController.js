import { Project } from "../models/Project.js";
import { Task } from "../models/Task.js";

export const getAllProjects = async (req, res, next) => {
  try {
    const projects = await Project.find().lean();
    res.json(projects.map((p) => ({
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
    })));
  } catch (err) { next(err); }
};

export const getProjectById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const project = await Project.findById(id).lean();
    if (!project) return res.status(404).json({ message: "Project not found" });
    res.json({
      id: project._id.toString(),
      name: project.name,
      description: project.description,
      status: project.status,
      progress: project.progress || 0,
      startDate: project.startDate,
      endDate: project.endDate,
      managerId: project.managerId,
      departmentId: project.departmentId,
      members: project.members || [],
    });
  } catch (err) { next(err); }
};

export const createProject = async (req, res, next) => {
  try {
    const { name, description, status, startDate, endDate, managerId, departmentId, members } = req.body;
    const project = await Project.create({
      name,
      description,
      status: status || "PLANNING",
      progress: 0,
      startDate,
      endDate,
      managerId,
      departmentId,
      members: members || [],
    });
    res.status(201).json({ id: project._id.toString(), message: "Project created" });
  } catch (err) { next(err); }
};

export const updateProject = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description, status, progress, startDate, endDate, managerId, departmentId, members } = req.body;
    const project = await Project.findByIdAndUpdate(id, {
      name,
      description,
      status,
      progress,
      startDate,
      endDate,
      managerId,
      departmentId,
      members,
    }, { new: true });
    if (!project) return res.status(404).json({ message: "Project not found" });
    res.json({ id: project._id.toString(), message: "Project updated" });
  } catch (err) { next(err); }
};

export const deleteProject = async (req, res, next) => {
  try {
    const { id } = req.params;
    const project = await Project.findByIdAndDelete(id);
    if (!project) return res.status(404).json({ message: "Project not found" });
    await Task.deleteMany({ projectId: id });
    res.json({ success: true, message: "Project deleted" });
  } catch (err) { next(err); }
};

export const getProjectTasks = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const tasks = await Task.find({ projectId }).lean();
    res.json(tasks.map((t) => ({
      id: t._id.toString(),
      name: t.name,
      description: t.description,
      status: t.status,
      priority: t.priority,
      assigneeId: t.assigneeId,
      dueDate: t.dueDate,
      projectId: t.projectId,
    })));
  } catch (err) { next(err); }
};

export const createProjectTask = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { name, description, status, priority, assigneeId, dueDate } = req.body;
    const task = await Task.create({
      name,
      description,
      status: status || "TODO",
      priority: priority || "MEDIUM",
      assigneeId,
      dueDate,
      projectId,
    });
    res.status(201).json({ id: task._id.toString(), message: "Task created" });
  } catch (err) { next(err); }
};

export const updateTask = async (req, res, next) => {
  try {
    const { taskId } = req.params;
    const { name, description, status, priority, assigneeId, dueDate } = req.body;
    const task = await Task.findByIdAndUpdate(taskId, {
      name,
      description,
      status,
      priority,
      assigneeId,
      dueDate,
    }, { new: true });
    if (!task) return res.status(404).json({ message: "Task not found" });
    res.json({ id: task._id.toString(), message: "Task updated" });
  } catch (err) { next(err); }
};
