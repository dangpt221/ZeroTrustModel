import express from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import * as departmentController from "../controllers/departmentController.js";

const router = express.Router();

router.get("/departments", requireAuth, departmentController.getAllDepartments);
router.get("/departments/:id", requireAuth, departmentController.getDepartmentById);
router.post("/departments", requireAuth, requireRole(["ADMIN"]), departmentController.createDepartment);
router.put("/departments/:id", requireAuth, requireRole(["ADMIN"]), departmentController.updateDepartment);
router.delete("/departments/:id", requireAuth, requireRole(["ADMIN"]), departmentController.deleteDepartment);

export default router;
