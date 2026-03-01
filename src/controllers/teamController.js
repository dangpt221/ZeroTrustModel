import { Team } from "../models/Team.js";

export const getAllTeams = async (req, res, next) => {
  try {
    const teams = await Team.find().lean();
    res.json(teams.map((t) => ({
      id: t._id.toString(),
      name: t.name,
      description: t.description,
      leaderId: t.leaderId,
      memberIds: t.members || [],
      projectId: t.projectId,
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
      leaderId: team.leaderId,
      memberIds: team.members || [],
      projectId: team.projectId,
      createdAt: team.createdAt,
    });
  } catch (err) { next(err); }
};

export const createTeam = async (req, res, next) => {
  try {
    const { name, description, leaderId, projectId, memberIds } = req.body;
    const team = await Team.create({ name, description, leaderId, projectId, members: memberIds || [] });
    res.status(201).json({ id: team._id.toString(), message: "Team created" });
  } catch (err) { next(err); }
};

export const updateTeam = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description, leaderId, projectId, memberIds } = req.body;
    const team = await Team.findByIdAndUpdate(id, { name, description, leaderId, projectId, members: memberIds }, { new: true });
    if (!team) return res.status(404).json({ message: "Team not found" });
    res.json({ id: team._id.toString(), message: "Team updated" });
  } catch (err) { next(err); }
};

export const deleteTeam = async (req, res, next) => {
  try {
    const { id } = req.params;
    const team = await Team.findByIdAndDelete(id);
    if (!team) return res.status(404).json({ message: "Team not found" });
    res.json({ success: true, message: "Team deleted" });
  } catch (err) { next(err); }
};

export const addTeamMember = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;
    const team = await Team.findById(id);
    if (!team) return res.status(404).json({ message: "Team not found" });
    if (!team.members.includes(userId)) {
      team.members.push(userId);
      await team.save();
    }
    res.json({ success: true, message: "Member added" });
  } catch (err) { next(err); }
};

export const removeTeamMember = async (req, res, next) => {
  try {
    const { id, userId } = req.params;
    const team = await Team.findById(id);
    if (!team) return res.status(404).json({ message: "Team not found" });
    team.members = team.members.filter((m) => m.toString() !== userId);
    await team.save();
    res.json({ success: true, message: "Member removed" });
  } catch (err) { next(err); }
};
