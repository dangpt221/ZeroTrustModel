import { Department } from "../models/Department.js";
import { User } from "../models/User.js";

export const getAllDepartments = async (req, res, next) => {
  try {
    const depts = await Department.find().lean();
    const deptsWithCount = await Promise.all(depts.map(async (d) => {
      const memberCount = await User.countDocuments({ departmentId: d._id });
      return { id: d._id.toString(), name: d.name, description: d.description, managerId: d.managerId, memberCount };
    }));
    res.json(deptsWithCount);
  } catch (err) { next(err); }
};

export const getDepartmentById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const dept = await Department.findById(id).lean();
    if (!dept) return res.status(404).json({ message: "Department not found" });
    const memberCount = await User.countDocuments({ departmentId: dept._id });
    res.json({ id: dept._id.toString(), name: dept.name, description: dept.description, managerId: dept.managerId, memberCount });
  } catch (err) { next(err); }
};

export const createDepartment = async (req, res, next) => {
  try {
    const { name, description, managerId } = req.body;
    const dept = await Department.create({ name, description, managerId });
    res.status(201).json({ id: dept._id.toString(), name: dept.name, message: "Department created" });
  } catch (err) { next(err); }
};

export const updateDepartment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description, managerId } = req.body;
    const dept = await Department.findByIdAndUpdate(id, { name, description, managerId }, { new: true });
    if (!dept) return res.status(404).json({ message: "Department not found" });
    res.json({ id: dept._id.toString(), name: dept.name, message: "Department updated" });
  } catch (err) { next(err); }
};

export const deleteDepartment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const dept = await Department.findByIdAndDelete(id);
    if (!dept) return res.status(404).json({ message: "Department not found" });
    res.json({ success: true, message: "Department deleted" });
  } catch (err) { next(err); }
};
