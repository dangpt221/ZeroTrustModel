import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import * as userController from "../controllers/userController.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { Role } from "../models/Role.js";

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
router.get("/admin/users", requireAuth, requireRole(["ADMIN"]), userController.getAllUsers);
router.post("/admin/users", requireAuth, requireRole(["ADMIN"]), userController.createUser);
router.put("/admin/users/:id", requireAuth, requireRole(["ADMIN"]), userController.updateUser);
router.delete("/admin/users/:id", requireAuth, requireRole(["ADMIN"]), userController.deleteUser);
router.post("/admin/users/:id/lock", requireAuth, requireRole(["ADMIN"]), userController.lockUser);
router.post("/admin/users/:id/approve", requireAuth, requireRole(["ADMIN"]), userController.approveUser);
router.post("/admin/users/:id/reject", requireAuth, requireRole(["ADMIN"]), userController.rejectUser);
router.post("/admin/users/:id/mfa", requireAuth, requireRole(["ADMIN"]), userController.toggleMfa);
router.post("/admin/users/:id/reset-password", requireAuth, requireRole(["ADMIN"]), userController.resetPassword);

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
    await req.app.locals.db.collection('users').findOneAndUpdate(
      { _id: require('mongoose').Types.ObjectId.createFromHexString(req.user._id.toString()) },
      { $set: { avatar: url } }
    );
    res.json({ url });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ============ ROLE & PERMISSION ROUTES ============

// Get all roles
router.get("/admin/roles", requireAuth, requireRole(["ADMIN"]), async (req, res, next) => {
  try {
    const roles = await Role.find().lean();
    res.json(roles.map((r) => ({
      id: r._id.toString(),
      name: r.name,
      description: r.description,
      permissions: r.permissions || [],
      color: r.color || 'bg-blue-500'
    })));
  } catch (err) { next(err); }
});

// Create new role
router.post("/admin/roles", requireAuth, requireRole(["ADMIN"]), async (req, res, next) => {
  try {
    const { name, description, permissions, color } = req.body;
    const role = await Role.create({ name, description, permissions: permissions || [], color });
    res.status(201).json({
      id: role._id.toString(),
      name: role.name,
      description: role.description,
      permissions: role.permissions,
      color: role.color || 'bg-blue-500'
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ message: "Vai trò đã tồn tại" });
    }
    next(err);
  }
});

// Update role
router.put("/admin/roles/:id", requireAuth, requireRole(["ADMIN"]), async (req, res, next) => {
  try {
    const { name, description, permissions, color } = req.body;
    const role = await Role.findByIdAndUpdate(
      req.params.id,
      { name, description, permissions: permissions || [], color },
      { new: true }
    );
    if (!role) return res.status(404).json({ message: "Vai trò không tồn tại" });
    res.json({
      id: role._id.toString(),
      name: role.name,
      description: role.description,
      permissions: role.permissions,
      color: role.color
    });
  } catch (err) { next(err); }
});

// Delete role
router.delete("/admin/roles/:id", requireAuth, requireRole(["ADMIN"]), async (req, res, next) => {
  try {
    const role = await Role.findByIdAndDelete(req.params.id);
    if (!role) return res.status(404).json({ message: "Vai trò không tồn tại" });
    res.json({ success: true, message: "Vai trò đã được xóa" });
  } catch (err) { next(err); }
});

// Get all permissions (defined system-wide)
router.get("/admin/permissions", requireAuth, requireRole(["ADMIN"]), async (req, res) => {
  res.json([
    // User Management
    { id: "USER_VIEW", name: "Xem người dùng", code: "USER_VIEW", description: "Xem danh sách người dùng" },
    { id: "USER_CREATE", name: "Tạo người dùng", code: "USER_CREATE", description: "Tạo mới người dùng" },
    { id: "USER_EDIT", name: "Sửa người dùng", code: "USER_EDIT", description: "Chỉnh sửa thông tin người dùng" },
    { id: "USER_DELETE", name: "Xóa người dùng", code: "USER_DELETE", description: "Xóa người dùng" },
    { id: "USER_APPROVE", name: "Phê duyệt người dùng", code: "USER_APPROVE", description: "Phê duyệt đăng ký mới" },

    // Role Management
    { id: "ROLE_VIEW", name: "Xem vai trò", code: "ROLE_VIEW", description: "Xem danh sách vai trò" },
    { id: "ROLE_MANAGE", name: "Quản lý vai trò", code: "ROLE_MANAGE", description: "Tạo/sửa/xóa vai trò" },

    // Department Management
    { id: "DEPT_VIEW", name: "Xem phòng ban", code: "DEPT_VIEW", description: "Xem danh sách phòng ban" },
    { id: "DEPT_CREATE", name: "Tạo phòng ban", code: "DEPT_CREATE", description: "Tạo mới phòng ban" },
    { id: "DEPT_EDIT", name: "Sửa phòng ban", code: "DEPT_EDIT", description: "Chỉnh sửa phòng ban" },
    { id: "DEPT_DELETE", name: "Xóa phòng ban", code: "DEPT_DELETE", description: "Xóa phòng ban" },

    // Project Management
    { id: "PROJECT_VIEW", name: "Xem dự án", code: "PROJECT_VIEW", description: "Xem danh sách dự án" },
    { id: "PROJECT_CREATE", name: "Tạo dự án", code: "PROJECT_CREATE", description: "Tạo mới dự án" },
    { id: "PROJECT_EDIT", name: "Sửa dự án", code: "PROJECT_EDIT", description: "Chỉnh sửa dự án" },
    { id: "PROJECT_DELETE", name: "Xóa dự án", code: "PROJECT_DELETE", description: "Xóa dự án" },

    // Document Management
    { id: "DOC_VIEW", name: "Xem tài liệu", code: "DOC_VIEW", description: "Xem tài liệu" },
    { id: "DOC_UPLOAD", name: "Tải lên tài liệu", code: "DOC_UPLOAD", description: "Tải lên tài liệu mới" },
    { id: "DOC_APPROVE", name: "Phê duyệt tài liệu", code: "DOC_APPROVE", description: "Phê duyệt tài liệu" },
    { id: "DOC_DELETE", name: "Xóa tài liệu", code: "DOC_DELETE", description: "Xóa tài liệu" },

    // Attendance
    { id: "ATTENDANCE_VIEW", name: "Xem chấm công", code: "ATTENDANCE_VIEW", description: "Xem lịch sử chấm công" },
    { id: "ATTENDANCE_MANAGE", name: "Quản lý chấm công", code: "ATTENDANCE_MANAGE", description: "Quản lý chấm công" },

    // Audit Logs
    { id: "AUDIT_VIEW", name: "Xem nhật ký", code: "AUDIT_VIEW", description: "Xem nhật ký hoạt động" },

    // Zero Trust Settings
    { id: "ZT_VIEW", name: "Xem cấu hình bảo mật", code: "ZT_VIEW", description: "Xem cấu hình Zero Trust" },
    { id: "ZT_MANAGE", name: "Quản lý bảo mật", code: "ZT_MANAGE", description: "Thay đổi cấu hình bảo mật" },

    // Notifications
    { id: "NOTIF_SEND", name: "Gửi thông báo", code: "NOTIF_SEND", description: "Gửi thông báo hệ thống" },
  ]);
});

export default router;
