import express from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import * as chatController from "../controllers/chatManagementController.js";

const router = express.Router();

// All chat management routes require authentication
router.use(requireAuth);

// Routes for SUPER_ADMIN, ADMIN, MANAGER, AUDITOR
// Get chat statistics - ADMIN/SUPER_ADMIN/AUDITOR
router.get("/stats", requireRole(["SUPER_ADMIN", "ADMIN", "AUDITOR"]), chatController.getChatStats);

// Get all rooms - ADMIN/SUPER_ADMIN/MANAGER/AUDITOR
router.get("/rooms", requireRole(["SUPER_ADMIN", "ADMIN", "MANAGER", "AUDITOR"]), chatController.getAllRooms);

// Get room by ID - ADMIN/SUPER_ADMIN/MANAGER/AUDITOR
router.get("/rooms/:id", requireRole(["SUPER_ADMIN", "ADMIN", "MANAGER", "AUDITOR"]), chatController.getRoomById);

// Get messages from room - ADMIN/SUPER_ADMIN/MANAGER/AUDITOR
router.get("/rooms/:id/messages", requireRole(["SUPER_ADMIN", "ADMIN", "MANAGER", "AUDITOR"]), chatController.getRoomMessages);

// Search messages - ADMIN/SUPER_ADMIN/AUDITOR
router.get("/messages/search", requireRole(["SUPER_ADMIN", "ADMIN", "AUDITOR"]), chatController.searchMessages);

// Delete message - ADMIN/SUPER_ADMIN only
router.delete("/messages/:id", requireRole(["SUPER_ADMIN", "ADMIN"]), chatController.deleteMessage);

// Lock/Unlock room - ADMIN/SUPER_ADMIN
router.post("/rooms/:id/lock", requireRole(["SUPER_ADMIN", "ADMIN"]), chatController.toggleRoomLock);

// Add member - ADMIN/SUPER_ADMIN
router.post("/rooms/:id/members", requireRole(["SUPER_ADMIN", "ADMIN"]), chatController.addRoomMember);

// Remove member - ADMIN/SUPER_ADMIN
router.delete("/rooms/:id/members/:userId", requireRole(["SUPER_ADMIN", "ADMIN"]), chatController.removeRoomMember);

// Send system message - ADMIN/SUPER_ADMIN
router.post("/rooms/:id/system-message", requireRole(["SUPER_ADMIN", "ADMIN"]), chatController.sendSystemMessage);

// Delete room - ADMIN/SUPER_ADMIN
router.delete("/rooms/:id", requireRole(["SUPER_ADMIN", "ADMIN"]), chatController.deleteRoom);

// Export chat logs - ADMIN/SUPER_ADMIN/AUDITOR
router.get("/export", requireRole(["SUPER_ADMIN", "ADMIN", "AUDITOR"]), chatController.exportChatLogs);

// Chat policy - ADMIN/SUPER_ADMIN
router.get("/policy", requireRole(["SUPER_ADMIN", "ADMIN", "AUDITOR"]), chatController.getChatPolicy);
router.put("/policy", requireRole(["SUPER_ADMIN", "ADMIN"]), chatController.updateChatPolicy);

export default router;
