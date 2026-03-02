import { Department } from "../models/Department.js";
import { User } from "../models/User.js";
import { Project } from "../models/Project.js";

// Get all departments with member count and stats
export const getAllDepartments = async (req, res, next) => {
  try {
    const { includeInactive } = req.query;
    const query = includeInactive === 'true' ? {} : { isActive: true };

    const depts = await Department.find(query)
      .populate('managerId', 'name email avatar')
      .populate('parentId', 'name')
      .sort({ name: 1 })
      .lean();

    const deptsWithStats = await Promise.all(depts.map(async (d) => {
      const memberCount = await User.countDocuments({ departmentId: d._id, status: 'ACTIVE' });
      const projectCount = await Project.countDocuments({ departmentId: d._id, status: { $ne: 'COMPLETED' } });
      return {
        id: d._id.toString(),
        name: d.name,
        description: d.description,
        managerId: d.managerId?._id?.toString() || d.managerId,
        manager: d.managerId ? {
          id: d.managerId._id?.toString() || d.managerId,
          name: d.managerId.name,
          email: d.managerId.email,
          avatar: d.managerId.avatar
        } : null,
        parentId: d.parentId?._id?.toString() || d.parentId,
        parentName: d.parentId?.name || null,
        isActive: d.isActive,
        color: d.color,
        code: d.code,
        memberCount,
        projectCount,
        createdAt: d.createdAt,
        updatedAt: d.updatedAt
      };
    }));

    res.json(deptsWithStats);
  } catch (err) {
    next(err);
  }
};

// Get department by ID with full details
export const getDepartmentById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const dept = await Department.findById(id)
      .populate('managerId', 'name email avatar')
      .populate('parentId', 'name')
      .lean();

    if (!dept) {
      return res.status(404).json({ message: "Department not found" });
    }

    // Get members
    const members = await User.find({ departmentId: id })
      .select('name email avatar role status mfaEnabled trustScore createdAt')
      .lean();

    // Get projects
    const projects = await Project.find({ departmentId: id })
      .select('title status progress startDate endDate')
      .lean();

    const memberCount = await User.countDocuments({ departmentId: id, status: 'ACTIVE' });
    const projectCount = await Project.countDocuments({ departmentId: id, status: { $ne: 'COMPLETED' } });

    res.json({
      id: dept._id.toString(),
      name: dept.name,
      description: dept.description,
      managerId: dept.managerId?._id?.toString() || dept.managerId,
      manager: dept.managerId ? {
        id: dept.managerId._id?.toString() || dept.managerId,
        name: dept.managerId.name,
        email: dept.managerId.email,
        avatar: dept.managerId.avatar
      } : null,
      parentId: dept.parentId?._id?.toString() || dept.parentId,
      parentName: dept.parentId?.name || null,
      isActive: dept.isActive,
      color: dept.color,
      code: dept.code,
      memberCount,
      projectCount,
      members: members.map(m => ({
        id: m._id.toString(),
        name: m.name,
        email: m.email,
        avatar: m.avatar,
        role: m.role,
        status: m.status,
        mfaEnabled: m.mfaEnabled,
        trustScore: m.trustScore,
        joinedAt: m.createdAt
      })),
      projects: projects.map(p => ({
        id: p._id.toString(),
        title: p.title,
        status: p.status,
        progress: p.progress,
        startDate: p.startDate,
        endDate: p.endDate
      })),
      createdAt: dept.createdAt,
      updatedAt: dept.updatedAt
    });
  } catch (err) {
    next(err);
  }
};

// Create new department
export const createDepartment = async (req, res, next) => {
  try {
    const { name, description, managerId, parentId, color, code } = req.body;

    // Check for duplicate name
    const existing = await Department.findOne({ name });
    if (existing) {
      return res.status(400).json({ message: "Department name already exists" });
    }

    // Validate manager exists if provided
    if (managerId) {
      const manager = await User.findById(managerId);
      if (!manager) {
        return res.status(400).json({ message: "Manager not found" });
      }
    }

    const dept = await Department.create({
      name,
      description,
      managerId: managerId || null,
      parentId: parentId || null,
      color: color || '#3B82F6',
      code: code || name.substring(0, 3).toUpperCase()
    });

    // If manager assigned, update user's department
    if (managerId) {
      await User.findByIdAndUpdate(managerId, {
        departmentId: dept._id,
        role: 'MANAGER'
      });
    }

    res.status(201).json({
      id: dept._id.toString(),
      name: dept.name,
      description: dept.description,
      managerId: dept.managerId?.toString(),
      parentId: dept.parentId?.toString(),
      isActive: dept.isActive,
      color: dept.color,
      code: dept.code,
      message: "Department created successfully"
    });
  } catch (err) {
    next(err);
  }
};

// Update department
export const updateDepartment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description, managerId, parentId, isActive, color, code } = req.body;

    const dept = await Department.findById(id);
    if (!dept) {
      return res.status(404).json({ message: "Department not found" });
    }

    // Check for duplicate name (excluding current)
    if (name && name !== dept.name) {
      const existing = await Department.findOne({ name });
      if (existing) {
        return res.status(400).json({ message: "Department name already exists" });
      }
    }

    // Get old manager
    const oldManagerId = dept.managerId?.toString();

    // Update fields
    if (name) dept.name = name;
    if (description !== undefined) dept.description = description;
    if (parentId !== undefined) dept.parentId = parentId || null;
    if (isActive !== undefined) dept.isActive = isActive;
    if (color) dept.color = color;
    if (code) dept.code = code;

    // Handle manager change
    if (managerId !== undefined) {
      // Remove old manager's department
      if (oldManagerId && oldManagerId !== managerId) {
        await User.findByIdAndUpdate(oldManagerId, { departmentId: null });
      }

      // Assign new manager
      if (managerId) {
        dept.managerId = managerId;
        await User.findByIdAndUpdate(managerId, {
          departmentId: dept._id,
          role: 'MANAGER'
        });
      } else {
        dept.managerId = null;
      }
    }

    await dept.save();

    res.json({
      id: dept._id.toString(),
      name: dept.name,
      description: dept.description,
      managerId: dept.managerId?.toString(),
      parentId: dept.parentId?.toString(),
      isActive: dept.isActive,
      color: dept.color,
      code: dept.code,
      message: "Department updated successfully"
    });
  } catch (err) {
    next(err);
  }
};

// Delete (soft delete) department
export const deleteDepartment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { moveMembersTo } = req.body; // Optional: move members to another department

    const dept = await Department.findById(id);
    if (!dept) {
      return res.status(404).json({ message: "Department not found" });
    }

    // Check if there are active members
    const memberCount = await User.countDocuments({ departmentId: id, status: 'ACTIVE' });

    if (memberCount > 0 && !moveMembersTo) {
      return res.status(400).json({
        message: "Cannot delete department with active members. Please move members first.",
        memberCount
      });
    }

    // Move members to another department if specified
    if (moveMembersTo && memberCount > 0) {
      await User.updateMany(
        { departmentId: id },
        { departmentId: moveMembersTo }
      );
    }

    // Soft delete - just mark as inactive
    dept.isActive = false;
    await dept.save();

    res.json({
      success: true,
      message: "Department deactivated successfully"
    });
  } catch (err) {
    next(err);
  }
};

// Get department statistics
export const getDepartmentStats = async (req, res, next) => {
  try {
    const totalDepartments = await Department.countDocuments({ isActive: true });
    const totalMembers = await User.countDocuments({ status: 'ACTIVE' });
    const departmentsWithStats = await Promise.all([
      Department.find({ isActive: true }).lean(),
      User.aggregate([
        { $match: { status: 'ACTIVE' } },
        { $group: { _id: '$departmentId', count: { $sum: 1 } } }
      ]),
      Project.aggregate([
        { $match: { status: { $ne: 'COMPLETED' } } },
        { $group: { _id: '$departmentId', count: { $sum: 1 } } }
      ])
    ]);

    const memberByDept = departmentsWithStats[1].reduce((acc, curr) => {
      acc[curr._id?.toString()] = curr.count;
      return acc;
    }, {});

    const projectByDept = departmentsWithStats[2].reduce((acc, curr) => {
      acc[curr._id?.toString()] = curr.count;
      return acc;
    }, {});

    const departmentStats = departmentsWithStats[0].map(d => ({
      id: d._id.toString(),
      name: d.name,
      memberCount: memberByDept[d._id.toString()] || 0,
      projectCount: projectByDept[d._id.toString()] || 0
    }));

    res.json({
      totalDepartments,
      totalMembers,
      departments: departmentStats
    });
  } catch (err) {
    next(err);
  }
};

// Assign member to department
export const assignMember = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { userId, role } = req.body;

    const dept = await Department.findById(id);
    if (!dept) {
      return res.status(404).json({ message: "Department not found" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Update user's department
    user.departmentId = id;
    if (role) user.role = role;
    await user.save();

    res.json({
      success: true,
      message: "Member assigned successfully"
    });
  } catch (err) {
    next(err);
  }
};

// Remove member from department
export const removeMember = async (req, res, next) => {
  try {
    const { id, userId } = req.params;

    const dept = await Department.findById(id);
    if (!dept) {
      return res.status(404).json({ message: "Department not found" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if user is the manager
    if (dept.managerId?.toString() === userId) {
      dept.managerId = null;
      await dept.save();
    }

    // Remove user's department
    user.departmentId = null;
    await user.save();

    res.json({
      success: true,
      message: "Member removed successfully"
    });
  } catch (err) {
    next(err);
  }
};
