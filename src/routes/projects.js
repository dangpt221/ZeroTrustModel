import express from "express";
import { requireAuth, requirePermission } from "../middleware/auth.js";
import * as projectController from "../controllers/projectController.js";

const router = express.Router();

router.get("/projects", requireAuth, projectController.getAllProjects);
router.get("/projects/:id", requireAuth, projectController.getProjectById);
router.post("/projects", requireAuth, requirePermission(["PROJECT_CREATE"]), projectController.createProject);
router.put("/projects/:id", requireAuth, requirePermission(["PROJECT_EDIT"]), projectController.updateProject);
router.delete("/projects/:id", requireAuth, requirePermission(["PROJECT_DELETE"]), projectController.deleteProject);
router.get("/projects/:projectId/tasks", requireAuth, projectController.getProjectTasks);
router.post("/projects/:projectId/tasks", requireAuth, projectController.createProjectTask);
router.put("/tasks/:taskId", requireAuth, projectController.updateTask);

export default router;
