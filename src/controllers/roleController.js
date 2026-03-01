import { Role } from "../models/Role.js";
import { User } from "../models/User.js";

// Get all roles
export const getAllRoles = async (req, res, next) => {
  try {
    const roles = await Role.find().sort({ createdAt: 1 }).lean();
    res.json(roles.map((r) => ({
      id: r._id.toString(),
      name: r.name,
      description: r.description,
      permissions: r.permissions || [],
      color: r.color || 'bg-blue-500',
      isActive: r.isActive ?? true,
      isSystem: r.isSystem ?? false,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    })));
  } catch (err) {
    next(err);
  }
};

// Get role by ID with user count
export const getRoleById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const role = await Role.findById(id).lean();
    if (!role) return res.status(404).json({ message: "Vai trò không tồn tại" });

    // Count users with this role
    const userCount = await User.countDocuments({ role: role.name });

    res.json({
      id: role._id.toString(),
      name: role.name,
      description: role.description,
      permissions: role.permissions || [],
      color: role.color || 'bg-blue-500',
      isActive: role.isActive ?? true,
      isSystem: role.isSystem ?? false,
      userCount,
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
    });
  } catch (err) {
    next(err);
  }
};

// Create new role
export const createRole = async (req, res, next) => {
  try {
    const { name, description, permissions, color } = req.body;

    // Check if role name already exists
    const existing = await Role.findOne({ name });
    if (existing) {
      return res.status(400).json({ message: "Tên vai trò đã tồn tại" });
    }

    const role = await Role.create({
      name,
      description: description || '',
      permissions: permissions || [],
      color: color || 'bg-blue-500',
      isActive: true,
      isSystem: false,
    });

    res.status(201).json({
      id: role._id.toString(),
      name: role.name,
      description: role.description,
      permissions: role.permissions,
      color: role.color,
      isActive: role.isActive,
      isSystem: role.isSystem,
      createdAt: role.createdAt,
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ message: "Tên vai trò đã tồn tại" });
    }
    next(err);
  }
};

// Update role
export const updateRole = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description, permissions, color, isActive } = req.body;

    const role = await Role.findById(id);
    if (!role) {
      return res.status(404).json({ message: "Vai trò không tồn tại" });
    }

    // Cannot modify system roles
    if (role.isSystem) {
      return res.status(403).json({ message: "Không thể sửa vai trò hệ thống" });
    }

    // Check if new name already exists (excluding current role)
    if (name && name !== role.name) {
      const existing = await Role.findOne({ name });
      if (existing) {
        return res.status(400).json({ message: "Tên vai trò đã tồn tại" });
      }
      role.name = name;
    }

    if (description !== undefined) role.description = description;
    if (permissions) role.permissions = permissions;
    if (color) role.color = color;
    if (isActive !== undefined) role.isActive = isActive;

    await role.save();

    res.json({
      id: role._id.toString(),
      name: role.name,
      description: role.description,
      permissions: role.permissions,
      color: role.color,
      isActive: role.isActive,
      isSystem: role.isSystem,
      updatedAt: role.updatedAt,
    });
  } catch (err) {
    next(err);
  }
};

// Delete role
export const deleteRole = async (req, res, next) => {
  try {
    const { id } = req.params;

    const role = await Role.findById(id);
    if (!role) {
      return res.status(404).json({ message: "Vai trò không tồn tại" });
    }

    // Cannot delete system roles
    if (role.isSystem) {
      return res.status(403).json({ message: "Không thể xóa vai trò hệ thống" });
    }

    // Check if any users have this role
    const userCount = await User.countDocuments({ role: role.name });
    if (userCount > 0) {
      return res.status(400).json({
        message: `Không thể xóa vai trò này. Có ${userCount} người dùng đang sử dụng vai trò này.`
      });
    }

    await Role.findByIdAndDelete(id);

    res.json({ success: true, message: "Vai trò đã được xóa" });
  } catch (err) {
    next(err);
  }
};

// Get users by role
export const getUsersByRole = async (req, res, next) => {
  try {
    const { roleName } = req.params;
    const users = await User.find({ role: roleName }).lean();

    res.json(users.map((u) => ({
      id: u._id.toString(),
      name: u.name,
      email: u.email,
      role: u.role,
      status: u.status,
      avatar: u.avatar || `https://picsum.photos/seed/${u._id}/200`,
      departmentId: u.departmentId?.toString(),
      createdAt: u.createdAt,
    })));
  } catch (err) {
    next(err);
  }
};

// Get all permissions (system-defined)
export const getAllPermissions = async (req, res) => {
  res.json([
    // User Management
    { id: "USER_VIEW", name: "Xem người dùng", code: "USER_VIEW", description: "Xem danh sách người dùng", category: "User Management" },
    { id: "USER_CREATE", name: "Tạo người dùng", code: "USER_CREATE", description: "Tạo mới người dùng", category: "User Management" },
    { id: "USER_EDIT", name: "Sửa người dùng", code: "USER_EDIT", description: "Chỉnh sửa thông tin người dùng", category: "User Management" },
    { id: "USER_DELETE", name: "Xóa người dùng", code: "USER_DELETE", description: "Xóa người dùng", category: "User Management" },
    { id: "USER_APPROVE", name: "Phê duyệt người dùng", code: "USER_APPROVE", description: "Phê duyệt đăng ký mới", category: "User Management" },
    { id: "USER_LOCK", name: "Khóa/Mở khóa người dùng", code: "USER_LOCK", description: "Khóa hoặc mở khóa tài khoản", category: "User Management" },

    // Role Management
    { id: "ROLE_VIEW", name: "Xem vai trò", code: "ROLE_VIEW", description: "Xem danh sách vai trò", category: "Role Management" },
    { id: "ROLE_CREATE", name: "Tạo vai trò", code: "ROLE_CREATE", description: "Tạo mới vai trò", category: "Role Management" },
    { id: "ROLE_EDIT", name: "Sửa vai trò", code: "ROLE_EDIT", description: "Chỉnh sửa vai trò", category: "Role Management" },
    { id: "ROLE_DELETE", name: "Xóa vai trò", code: "ROLE_DELETE", description: "Xóa vai trò", category: "Role Management" },

    // Department Management
    { id: "DEPT_VIEW", name: "Xem phòng ban", code: "DEPT_VIEW", description: "Xem danh sách phòng ban", category: "Department" },
    { id: "DEPT_CREATE", name: "Tạo phòng ban", code: "DEPT_CREATE", description: "Tạo mới phòng ban", category: "Department" },
    { id: "DEPT_EDIT", name: "Sửa phòng ban", code: "DEPT_EDIT", description: "Chỉnh sửa phòng ban", category: "Department" },
    { id: "DEPT_DELETE", name: "Xóa phòng ban", code: "DEPT_DELETE", description: "Xóa phòng ban", category: "Department" },

    // Project Management
    { id: "PROJECT_VIEW", name: "Xem dự án", code: "PROJECT_VIEW", description: "Xem danh sách dự án", category: "Project" },
    { id: "PROJECT_CREATE", name: "Tạo dự án", code: "PROJECT_CREATE", description: "Tạo mới dự án", category: "Project" },
    { id: "PROJECT_EDIT", name: "Sửa dự án", code: "PROJECT_EDIT", description: "Chỉnh sửa dự án", category: "Project" },
    { id: "PROJECT_DELETE", name: "Xóa dự án", code: "PROJECT_DELETE", description: "Xóa dự án", category: "Project" },
    { id: "PROJECT_ASSIGN", name: "Giao việc dự án", code: "PROJECT_ASSIGN", description: "Giao thành viên vào dự án", category: "Project" },

    // Document Management
    { id: "DOC_VIEW", name: "Xem tài liệu", code: "DOC_VIEW", description: "Xem tài liệu", category: "Document" },
    { id: "DOC_UPLOAD", name: "Tải lên tài liệu", code: "DOC_UPLOAD", description: "Tải lên tài liệu mới", category: "Document" },
    { id: "DOC_EDIT", name: "Sửa tài liệu", code: "DOC_EDIT", description: "Chỉnh sửa tài liệu", category: "Document" },
    { id: "DOC_APPROVE", name: "Phê duyệt tài liệu", code: "DOC_APPROVE", description: "Phê duyệt tài liệu", category: "Document" },
    { id: "DOC_DELETE", name: "Xóa tài liệu", code: "DOC_DELETE", description: "Xóa tài liệu", category: "Document" },

    // Attendance
    { id: "ATTENDANCE_VIEW", name: "Xem chấm công", code: "ATTENDANCE_VIEW", description: "Xem lịch sử chấm công", category: "Attendance" },
    { id: "ATTENDANCE_MANAGE", name: "Quản lý chấm công", code: "ATTENDANCE_MANAGE", description: "Quản lý chấm công", category: "Attendance" },
    { id: "ATTENDANCE_CHECKIN", name: "Chấm công", code: "ATTENDANCE_CHECKIN", description: "Chấm công vào/ra", category: "Attendance" },

    // Audit Logs
    { id: "AUDIT_VIEW", name: "Xem nhật ký", code: "AUDIT_VIEW", description: "Xem nhật ký hoạt động", category: "Audit" },
    { id: "AUDIT_EXPORT", name: "Xuất nhật ký", code: "AUDIT_EXPORT", description: "Xuất báo cáo nhật ký", category: "Audit" },

    // Zero Trust Settings
    { id: "ZT_VIEW", name: "Xem cấu hình bảo mật", code: "ZT_VIEW", description: "Xem cấu hình Zero Trust", category: "Security" },
    { id: "ZT_MANAGE", name: "Quản lý bảo mật", code: "ZT_MANAGE", description: "Thay đổi cấu hình bảo mật", category: "Security" },

    // Notifications
    { id: "NOTIF_VIEW", name: "Xem thông báo", code: "NOTIF_VIEW", description: "Xem thông báo", category: "Notifications" },
    { id: "NOTIF_SEND", name: "Gửi thông báo", code: "NOTIF_SEND", description: "Gửi thông báo hệ thống", category: "Notifications" },

    // Reports
    { id: "REPORT_VIEW", name: "Xem báo cáo", code: "REPORT_VIEW", description: "Xem báo cáo thống kê", category: "Reports" },
    { id: "REPORT_EXPORT", name: "Xuất báo cáo", code: "REPORT_EXPORT", description: "Xuất báo cáo", category: "Reports" },
  ]);
};
