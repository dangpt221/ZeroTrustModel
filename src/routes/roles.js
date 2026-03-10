import express from "express";
import * as roleController from "../controllers/roleController.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = express.Router();

// Role CRUD
router.get("/roles", requireAuth, requireRole(["ADMIN"]), roleController.getAllRoles);
router.get("/roles/:id", requireAuth, requireRole(["ADMIN"]), roleController.getRoleById);
router.post("/roles", requireAuth, requireRole(["ADMIN"]), roleController.createRole);
router.put("/roles/:id", requireAuth, requireRole(["ADMIN"]), roleController.updateRole);
router.delete("/roles/:id", requireAuth, requireRole(["ADMIN"]), roleController.deleteRole);

// Get users by role
router.get("/roles/:roleName/users", requireAuth, requireRole(["ADMIN"]), roleController.getUsersByRole);

// Permissions (read only)
router.get("/permissions", requireAuth, requireRole(["ADMIN"]), roleController.getAllPermissions);

export default router;
