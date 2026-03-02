import express from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import * as departmentController from "../controllers/departmentController.js";

const router = express.Router();

// Get all departments
router.get("/departments", requireAuth, departmentController.getAllDepartments);

// Get department by ID with full details
router.get("/departments/:id", requireAuth, departmentController.getDepartmentById);

// Get department statistics
router.get("/departments-stats/stats", requireAuth, departmentController.getDepartmentStats);

// Create department
router.post("/departments", requireAuth, requireRole(["ADMIN"]), departmentController.createDepartment);

// Update department
router.put("/departments/:id", requireAuth, requireRole(["ADMIN"]), departmentController.updateDepartment);

// Delete department (soft delete)
router.delete("/departments/:id", requireAuth, requireRole(["ADMIN"]), departmentController.deleteDepartment);

// Assign member to department
router.post("/departments/:id/members", requireAuth, requireRole(["ADMIN"]), departmentController.assignMember);

// Remove member from department
router.delete("/departments/:id/members/:userId", requireAuth, requireRole(["ADMIN"]), departmentController.removeMember);

export default router;
