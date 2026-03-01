import express from "express";
import * as roleController from "../controllers/roleController.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = express.Router();

// All role routes require ADMIN
router.use(requireAuth);
router.use(requireRole(["ADMIN"]));

// Role CRUD
router.get("/roles", roleController.getAllRoles);
router.get("/roles/:id", roleController.getRoleById);
router.post("/roles", roleController.createRole);
router.put("/roles/:id", roleController.updateRole);
router.delete("/roles/:id", roleController.deleteRole);

// Get users by role
router.get("/roles/:roleName/users", roleController.getUsersByRole);

// Permissions (read only)
router.get("/permissions", roleController.getAllPermissions);

export default router;
