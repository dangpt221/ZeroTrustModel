import express from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import * as teamController from "../controllers/teamController.js";

const router = express.Router();

router.get("/teams", requireAuth, teamController.getAllTeams);
router.get("/teams/:id", requireAuth, teamController.getTeamById);
router.post("/teams", requireAuth, requireRole(["ADMIN", "MANAGER"]), teamController.createTeam);
router.put("/teams/:id", requireAuth, requireRole(["ADMIN", "MANAGER"]), teamController.updateTeam);
router.delete("/teams/:id", requireAuth, requireRole(["ADMIN", "MANAGER"]), teamController.deleteTeam);
router.post("/teams/:id/members", requireAuth, requireRole(["ADMIN", "MANAGER"]), teamController.addTeamMember);
router.delete("/teams/:id/members/:userId", requireAuth, requireRole(["ADMIN", "MANAGER"]), teamController.removeTeamMember);

export default router;
