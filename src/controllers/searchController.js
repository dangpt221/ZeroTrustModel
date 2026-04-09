import { User } from "../models/User.js";
import { Project } from "../models/Project.js";
import { Department } from "../models/Department.js";
import { Document } from "../models/Document.js";

export const globalSearch = async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length === 0) {
      return res.json({ results: [] });
    }

    const keyword = q.trim();
    const regex = new RegExp(keyword, 'i');
    
    // Authorization Context
    const userRole = req.user.role;
    const userId = req.user.id;
    const isAdmin = userRole === 'ADMIN';

    // 1. Search Users
    const userQuery = {
      $or: [{ name: regex }, { email: regex }]
    };
    
    // 2. Search Projects
    const projectQuery = {
      $or: [{ name: regex }, { description: regex }]
    };
    // Staff can only see projects they are members of (unless Admin/Manager)
    if (userRole === 'STAFF') {
      projectQuery.members = userId;
      // Alternatively, could be managerId so limit them accordingly
    }

    // 3. Search Departments
    const deptQuery = { name: regex };

    // 4. Search Documents
    const docQuery = {
      title: regex,
      isDeleted: false
    };
    if (!isAdmin) {
      // Basic visibility check: PUBLIC or they own it
      // For more complex PBAC, we just do a simplified check for search
      docQuery.$or = [
        { visibility: 'PUBLIC' },
        { ownerId: userId },
        { departmentId: req.user.departmentId } // Assuming they can search their own Dept docs
      ];
    }

    // Parallel Search Execution
    const [users, projects, depts, docs] = await Promise.all([
      User.find(userQuery).select('name email avatar role status').lean().limit(5),
      Project.find(projectQuery).select('name status progress managerId').lean().limit(5),
      Department.find(deptQuery).select('name code managerId').lean().limit(5),
      Document.find(docQuery).select('title visibility type documentUrl').lean().limit(5)
    ]);

    // Format Results
    const results = [];

    users.forEach(u => {
      results.push({
        id: u._id.toString(),
        type: 'USER',
        label: u.name,
        subtitle: u.email,
        icon: 'User',
        link: isAdmin ? '/admin/users' : '/manager/staff' // Roughly
      });
    });

    projects.forEach(p => {
      results.push({
        id: p._id.toString(),
        type: 'PROJECT',
        label: p.name,
        subtitle: `Tiến độ: ${p.progress || 0}%`,
        icon: 'FolderKanban',
        link: `/projects/${p._id.toString()}`
      });
    });

    depts.forEach(d => {
      results.push({
        id: d._id.toString(),
        type: 'DEPARTMENT',
        label: d.name,
        subtitle: `Mã phòng: ${d.code || 'N/A'}`,
        icon: 'Building2',
        link: isAdmin ? '/admin/departments' : '/'
      });
    });

    docs.forEach(d => {
      results.push({
        id: d._id.toString(),
        type: 'DOCUMENT',
        label: d.title,
        subtitle: `Loại: ${d.type} - Quyền: ${d.visibility}`,
        icon: 'FileText',
        link: d.documentUrl ? d.documentUrl : '/manager/documents' // Link to viewing document
      });
    });

    res.json({ results });
  } catch (err) {
    next(err);
  }
};
