import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import * as userController from "../controllers/userController.js";
import { User } from "../models/User.js";
import { requireAuth, requireRole, requirePermission } from "../middleware/auth.js";
import { Role } from "../models/Role.js";
import * as roleController from "../controllers/roleController.js";

// Avatar upload setup
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const avatarsDir = path.join(__dirname, '../../uploads/avatars');
if (!fs.existsSync(avatarsDir)) {
  fs.mkdirSync(avatarsDir, { recursive: true });
}
const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, avatarsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${req.user?._id}-${Date.now()}${ext}`);
  }
});
const avatarUpload = multer({
  storage: avatarStorage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are allowed'));
  },
  limits: { fileSize: 5 * 1024 * 1024 }
});

const router = express.Router();

// ============ USER ROUTES ============

// Admin: Full user management
router.get("/admin/users", requireAuth, requirePermission(["USER_VIEW"]), userController.getAllUsers);
router.post("/admin/users", requireAuth, requirePermission(["USER_CREATE"]), userController.createUser);
router.put("/admin/users/:id", requireAuth, requirePermission(["USER_EDIT"]), userController.updateUser);
router.delete("/admin/users/:id", requireAuth, requirePermission(["USER_DELETE"]), userController.deleteUser);
router.post("/admin/users/:id/lock", requireAuth, requirePermission(["USER_EDIT"]), userController.lockUser);
router.post("/admin/users/:id/approve", requireAuth, requirePermission(["USER_APPROVE"]), userController.approveUser);
router.post("/admin/users/:id/reject", requireAuth, requirePermission(["USER_APPROVE"]), userController.rejectUser);
router.post("/admin/users/:id/mfa", requireAuth, requirePermission(["USER_EDIT"]), userController.toggleMfa);
router.post("/admin/users/:id/reset-password", requireAuth, requirePermission(["USER_EDIT"]), userController.resetPassword);

// Manager: Can view and manage their team members only
router.get("/manager/users", requireAuth, requireRole(["ADMIN", "MANAGER"]), userController.getTeamMembers);
router.put("/manager/users/:id", requireAuth, requireRole(["ADMIN", "MANAGER"]), userController.updateTeamMember);
router.post("/manager/users/:id/lock", requireAuth, requireRole(["ADMIN", "MANAGER"]), userController.lockTeamMember);

// Regular routes (all authenticated users)
router.get("/users", requireAuth, userController.getUsers);
router.get("/users/:id", requireAuth, userController.getUserById);
router.post("/users/upload-avatar", requireAuth, avatarUpload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });
    const url = `/uploads/avatars/${req.file.filename}`;
    
    await User.findByIdAndUpdate(req.user._id, { $set: { avatar: url } });
    
    res.json({ url });
  } catch (err) {
    console.error('Avatar upload error:', err);
    res.status(500).json({ message: err.message });
  }
});

// ============ ROLE & PERMISSION ROUTES ============

// Get all roles
router.get("/admin/roles", requireAuth, requirePermission(["ROLE_VIEW", "USER_VIEW"]), roleController.getAllRoles);

// Create new role
router.post("/admin/roles", requireAuth, requirePermission(["ROLE_MANAGE"]), roleController.createRole);

// Update role
router.put("/admin/roles/:id", requireAuth, requirePermission(["ROLE_MANAGE"]), roleController.updateRole);

// Delete role
router.delete("/admin/roles/:id", requireAuth, requirePermission(["ROLE_MANAGE"]), roleController.deleteRole);

// Get all permissions (defined system-wide)
router.get("/admin/permissions", requireAuth, requirePermission(["ROLE_VIEW", "ROLE_MANAGE", "USER_VIEW"]), roleController.getAllPermissions);

// Get users by role
router.get("/admin/roles/:roleName/users", requireAuth, requirePermission(["ROLE_VIEW", "USER_VIEW"]), roleController.getUsersByRole);

export default router;
