import { Team } from "../models/Team.js";

export const getAllTeams = async (req, res, next) => {
  try {
    const teams = await Team.find().lean();
    res.json(teams.map((t) => ({
      id: t._id.toString(),
      name: t.name,
      description: t.description,
      departmentId: t.departmentId ? t.departmentId.toString() : null,
      managerId: t.managerId ? t.managerId.toString() : null,
      memberIds: (t.members || []).map((m) => m.toString()),
      createdAt: t.createdAt,
    })));
  } catch (err) { next(err); }
};

export const getTeamById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const team = await Team.findById(id).lean();
    if (!team) return res.status(404).json({ message: "Team not found" });
    res.json({
      id: team._id.toString(),
      name: team.name,
      description: team.description,
      departmentId: team.departmentId ? team.departmentId.toString() : null,
      managerId: team.managerId ? team.managerId.toString() : null,
      memberIds: (team.members || []).map((m) => m.toString()),
      createdAt: team.createdAt,
    });
  } catch (err) { next(err); }
};

export const createTeam = async (req, res, next) => {
  try {
    const { name, description, departmentId, managerId, memberIds } = req.body;
    if (!departmentId) return res.status(400).json({ message: "departmentId is required" });
    const team = await Team.create({
      name,
      description,
      departmentId,
      managerId: managerId || req.user?.id,
      members: memberIds || [],
    });
    res.status(201).json({ id: team._id.toString(), message: "Team created" });
  } catch (err) { next(err); }
};

export const updateTeam = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description, managerId, memberIds } = req.body;
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (managerId !== undefined) updateData.managerId = managerId;
    if (memberIds !== undefined) updateData.members = memberIds;
    const team = await Team.findByIdAndUpdate(id, updateData, { new: true });
    if (!team) return res.status(404).json({ message: "Team not found" });
    res.json({ id: team._id.toString(), message: "Team updated" });
  } catch (err) { next(err); }
};

export const deleteTeam = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Authorization: Manager can only delete teams in their department
    if (req.user.role === "MANAGER") {
      const team = await Team.findById(id);
      if (!team) return res.status(404).json({ message: "Team not found" });
      if (team.departmentId?.toString() !== req.user.departmentId?.toString()) {
        return res.status(403).json({ message: "Bạn chỉ có thể xóa đội ngũ trong phòng ban của mình." });
      }
    }

    const team = await Team.findByIdAndDelete(id);
    if (!team) return res.status(404).json({ message: "Team not found" });
    res.json({ success: true, message: "Team deleted" });
  } catch (err) { next(err); }
};

export const addTeamMember = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;

    if (req.user.role === "MANAGER") {
      const team = await Team.findById(id);
      if (!team) return res.status(404).json({ message: "Team not found" });
      if (team.departmentId?.toString() !== req.user.departmentId?.toString()) {
        return res.status(403).json({ message: "Bạn chỉ có thể thêm thành viên vào đội ngũ trong phòng ban của mình." });
      }
    }

    const team = await Team.findById(id);
    if (!team) return res.status(404).json({ message: "Team not found" });
    const memberStr = userId.toString();
    if (!team.members.map(m => m.toString()).includes(memberStr)) {
      team.members.push(userId);
      await team.save();
    }
    res.json({ success: true, message: "Member added" });
  } catch (err) { next(err); }
};

export const removeTeamMember = async (req, res, next) => {
  try {
    const { id, userId } = req.params;

    if (req.user.role === "MANAGER") {
      const team = await Team.findById(id);
      if (!team) return res.status(404).json({ message: "Team not found" });
      if (team.departmentId?.toString() !== req.user.departmentId?.toString()) {
        return res.status(403).json({ message: "Bạn chỉ có thể xóa thành viên khỏi đội ngũ trong phòng ban của mình." });
      }
    }

    const team = await Team.findById(id);
    if (!team) return res.status(404).json({ message: "Team not found" });
    team.members = team.members.filter((m) => m.toString() !== userId);
    await team.save();
    res.json({ success: true, message: "Member removed" });
  } catch (err) { next(err); }
};
