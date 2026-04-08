import express from "express";
import * as departmentController from "../controllers/departmentController.js";
import { requireAuth, requirePermission } from "../middleware/auth.js";

const router = express.Router();

// Get all departments
router.get("/departments", requireAuth, departmentController.getAllDepartments);

// Get department by ID with full details
router.get("/departments/:id", requireAuth, departmentController.getDepartmentById);

// Get department statistics
router.get("/departments-stats/stats", requireAuth, departmentController.getDepartmentStats);

// Create department
router.post("/departments", requireAuth, requirePermission(["DEPT_CREATE"]), departmentController.createDepartment);

// Update department
router.put("/departments/:id", requireAuth, requirePermission(["DEPT_EDIT"]), departmentController.updateDepartment);

// Delete department (soft delete)
router.delete("/departments/:id", requireAuth, requirePermission(["DEPT_DELETE"]), departmentController.deleteDepartment);

// Assign member to department
router.post("/departments/:id/members", requireAuth, requirePermission(["DEPT_EDIT"]), departmentController.assignMember);

// Remove member from department
router.delete("/departments/:id/members/:userId", requireAuth, requirePermission(["DEPT_EDIT"]), departmentController.removeMember);

export default router;
