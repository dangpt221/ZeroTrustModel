import { User } from "../models/User.js";
import bcrypt from "bcryptjs";

// Get all users (admin)
export const getAllUsers = async (req, res, next) => {
  try {
    const users = await User.find()
      .populate('departmentId', 'name')
      .populate('customRoles')
      .lean();
    res.json(
      users.map((u) => ({
        id: u._id.toString(),
        name: u.name,
        email: u.email,
        role: u.role,
        status: u.status,
        avatar: u.avatar || `https://picsum.photos/seed/${u._id}/200`,
        departmentId: u.departmentId?._id?.toString() || u.departmentId?.toString(),
        department: u.departmentId?.name || '',
        trustScore: u.trustScore || 95,
        device: u.device || "Unknown",
        mfaEnabled: u.mfaEnabled || false,
        isLocked: u.isLocked || false,
        customRoles: u.customRoles || [],
        createdAt: u.createdAt,
        updatedAt: u.updatedAt,
      }))
    );
  } catch (err) {
    next(err);
  }
};

// Get users list
export const getUsers = async (req, res, next) => {
  try {
    const users = await User.find()
      .populate('departmentId', 'name')
      .populate('customRoles')
      .lean();
    res.json(
      users.map((u) => ({
        id: u._id.toString(),
        name: u.name,
        email: u.email,
        role: u.role,
        status: u.status,
        avatar: u.avatar || `https://picsum.photos/seed/${u._id}/200`,
        departmentId: u.departmentId?._id?.toString() || u.departmentId?.toString(),
        department: u.departmentId?.name || '',
        customRoles: u.customRoles || [],
      }))
    );
  } catch (err) {
    next(err);
  }
};

// Get user by ID
export const getUserById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id)
      .populate('departmentId', 'name')
      .populate('customRoles')
      .lean();
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      avatar: user.avatar || `https://picsum.photos/seed/${user._id}/200`,
      departmentId: user.departmentId?._id?.toString() || user.departmentId?.toString(),
      department: user.departmentId?.name || '',
      trustScore: user.trustScore || 95,
      device: user.device || "Unknown",
      mfaEnabled: user.mfaEnabled || false,
      isLocked: user.isLocked || false,
      customRoles: user.customRoles || [],
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });
  } catch (err) {
    next(err);
  }
};

// Create user
export const createUser = async (req, res, next) => {
  try {
    const { name, email, password, role, departmentId, mfaEnabled, customRoles } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email already exists" });
    }

    const passwordHash = await bcrypt.hash(password || "password123", 10);

    const user = await User.create({
      name,
      email,
      passwordHash,
      role: role || "STAFF",
      departmentId,
      mfaEnabled: mfaEnabled || false,
      status: "PENDING", // Enforce PENDING by default for Zero Trust approval flow
      trustScore: 95,
      customRoles: customRoles || [],
    });

    // Populate department to get name
    const populatedUser = await User.findById(user._id)
      .populate('departmentId', 'name')
      .populate('customRoles')
      .lean();

    res.status(201).json({
      id: populatedUser._id.toString(),
      name: populatedUser.name,
      email: populatedUser.email,
      role: populatedUser.role,
      status: populatedUser.status,
      avatar: populatedUser.avatar || `https://picsum.photos/seed/${populatedUser._id}/200`,
      departmentId: populatedUser.departmentId?._id?.toString() || populatedUser.departmentId?.toString(),
      department: populatedUser.departmentId?.name || '',
      mfaEnabled: populatedUser.mfaEnabled,
      customRoles: populatedUser.customRoles || [],
    });
  } catch (err) {
    next(err);
  }
};

// Update user
export const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, role, departmentId, mfaEnabled, password, customRoles } = req.body;

    const updateData = {};
    if (name) updateData.name = name;
    if (role) updateData.role = role;
    if (departmentId) updateData.departmentId = departmentId;
    if (mfaEnabled !== undefined) updateData.mfaEnabled = mfaEnabled;
    if (customRoles !== undefined) updateData.customRoles = customRoles;
    if (password) {
      updateData.passwordHash = await bcrypt.hash(password, 10);
    }

    const user = await User.findByIdAndUpdate(id, updateData, { new: true })
      .populate('departmentId', 'name')
      .populate('customRoles');
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      avatar: user.avatar || `https://picsum.photos/seed/${user._id}/200`,
      departmentId: user.departmentId?._id?.toString() || user.departmentId?.toString(),
      department: user.departmentId?.name || '',
      mfaEnabled: user.mfaEnabled,
      customRoles: user.customRoles || [],
    });
  } catch (err) {
    next(err);
  }
};

// Delete user
export const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await User.findByIdAndDelete(id);
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ success: true, message: "User deleted" });
  } catch (err) {
    next(err);
  }
};

// Lock/Unlock user
export const lockUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const isLocked = status === "LOCKED";
    const user = await User.findByIdAndUpdate(
      id,
      { isLocked, status },
      { new: true }
    );
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      isLocked: user.isLocked,
      mfaEnabled: user.mfaEnabled,
    });
  } catch (err) {
    next(err);
  }
};

// Approve user
export const approveUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await User.findByIdAndUpdate(
      id,
      { status: "ACTIVE" },
      { new: true }
    );
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({
      id: user._id.toString(),
      name: user.name,
      status: user.status,
    });
  } catch (err) {
    next(err);
  }
};

// Reject user
export const rejectUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await User.findByIdAndDelete(id);
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({ success: true, message: "User rejected and deleted" });
  } catch (err) {
    next(err);
  }
};

// Toggle MFA
export const toggleMfa = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { enabled } = req.body;

    const user = await User.findByIdAndUpdate(
      id,
      { mfaEnabled: enabled },
      { new: true }
    );
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({
      id: user._id.toString(),
      name: user.name,
      mfaEnabled: user.mfaEnabled,
    });
  } catch (err) {
    next(err);
  }
};

// Reset password
export const resetPassword = async (req, res, next) => {
  try {
    const { id } = req.params;

    const newPassword = Math.random().toString(36).slice(-8);
    const passwordHash = await bcrypt.hash(newPassword, 10);

    const user = await User.findByIdAndUpdate(
      id,
      { passwordHash },
      { new: true }
    );
    if (!user) return res.status(404).json({ message: "User not found" });

    // In production, send email with new password
    res.json({ message: "Password reset successfully" });
  } catch (err) {
    next(err);
  }
};

// ============ MANAGER FUNCTIONS ============

// Get team members (users in same department as manager)
export const getTeamMembers = async (req, res, next) => {
  try {
    const currentUser = await User.findById(req.user.id);
    if (!currentUser) return res.status(404).json({ message: "User not found" });

    // Admin can see all, Manager sees only their department
    let query = {};
    if (currentUser.role === "MANAGER" && currentUser.departmentId) {
      query = { departmentId: currentUser.departmentId, _id: { $ne: currentUser._id } };
    } else if (currentUser.role === "MANAGER") {
      // Manager without department sees all non-admin users
      query = { role: { $ne: "ADMIN" } };
    }

    const users = await User.find(query).lean();
    res.json(
      users.map((u) => ({
        id: u._id.toString(),
        name: u.name,
        email: u.email,
        role: u.role,
        status: u.status,
        avatar: u.avatar || `https://picsum.photos/seed/${u._id}/200`,
        departmentId: u.departmentId?.toString(),
        trustScore: u.trustScore || 95,
        device: u.device || "Unknown",
        mfaEnabled: u.mfaEnabled || false,
        isLocked: u.isLocked || false,
      }))
    );
  } catch (err) {
    next(err);
  }
};

// Update team member (Manager can only update basic info)
export const updateTeamMember = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, role, mfaEnabled } = req.body;

    // Check if target user exists
    const targetUser = await User.findById(id);
    if (!targetUser) return res.status(404).json({ message: "User not found" });

    // Managers cannot modify admins or promote themselves to admin
    if (targetUser.role === "ADMIN") {
      return res.status(403).json({ message: "Cannot modify admin users" });
    }
    if (role === "ADMIN") {
      return res.status(403).json({ message: "Cannot promote to admin" });
    }

    // Only allow certain fields to be updated by manager
    const updateData = {};
    if (name) updateData.name = name;
    if (role && (role === "MANAGER" || role === "STAFF")) updateData.role = role;
    if (mfaEnabled !== undefined) updateData.mfaEnabled = mfaEnabled;

    const user = await User.findByIdAndUpdate(id, updateData, { new: true });
    res.json({
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      mfaEnabled: user.mfaEnabled,
    });
  } catch (err) {
    next(err);
  }
};

// Lock/unlock team member
export const lockTeamMember = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const targetUser = await User.findById(id);
    if (!targetUser) return res.status(404).json({ message: "User not found" });

    // Managers cannot lock admins or lock themselves
    if (targetUser.role === "ADMIN") {
      return res.status(403).json({ message: "Cannot lock admin users" });
    }
    if (targetUser._id.toString() === req.user.id) {
      return res.status(403).json({ message: "Cannot lock yourself" });
    }

    const isLocked = status === "LOCKED";
    const user = await User.findByIdAndUpdate(
      id,
      { isLocked, status },
      { new: true }
    );

    res.json({
      id: user._id.toString(),
      name: user.name,
      status: user.status,
      isLocked: user.isLocked,
    });
  } catch (err) {
    next(err);
  }
};
