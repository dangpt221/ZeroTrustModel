import express from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import * as chatController from "../controllers/chatManagementController.js";

const router = express.Router();

// All chat management routes require authentication
router.use(requireAuth);

// Routes for ADMIN, MANAGER
// Get chat statistics - ADMIN
router.get("/stats", requireRole(["ADMIN"]), chatController.getChatStats);

// Get all rooms - ADMIN/MANAGER
router.get("/rooms", requireRole(["ADMIN", "MANAGER"]), chatController.getAllRooms);

// Get room by ID - ADMIN/MANAGER
router.get("/rooms/:id", requireRole(["ADMIN", "MANAGER"]), chatController.getRoomById);

// Get messages from room - ADMIN/MANAGER
router.get("/rooms/:id/messages", requireRole(["ADMIN", "MANAGER"]), chatController.getRoomMessages);

// Search messages - ADMIN
router.get("/messages/search", requireRole(["ADMIN"]), chatController.searchMessages);

// Delete message - ADMIN only
router.delete("/messages/:id", requireRole(["ADMIN"]), chatController.deleteMessage);

// Lock/Unlock room - ADMIN
router.post("/rooms/:id/lock", requireRole(["ADMIN"]), chatController.toggleRoomLock);

// Add member - ADMIN
router.post("/rooms/:id/members", requireRole(["ADMIN"]), chatController.addRoomMember);

// Remove member - ADMIN
router.delete("/rooms/:id/members/:userId", requireRole(["ADMIN"]), chatController.removeRoomMember);

// Send system message - ADMIN
router.post("/rooms/:id/system-message", requireRole(["ADMIN"]), chatController.sendSystemMessage);

// Delete room - ADMIN/MANAGER (manager can only delete their own rooms)
router.delete("/rooms/:id", requireRole(["ADMIN", "MANAGER"]), chatController.deleteRoom);

// Delete room by manager (soft delete, only own rooms)
router.delete("/rooms/:id/manager-delete", requireRole(["ADMIN", "MANAGER"]), chatController.managerDeleteRoom);

// Export chat logs - ADMIN
router.get("/export", requireRole(["ADMIN"]), chatController.exportChatLogs);

// Chat policy - ADMIN
router.get("/policy", requireRole(["ADMIN"]), chatController.getChatPolicy);
router.put("/policy", requireRole(["ADMIN"]), chatController.updateChatPolicy);

// Create room with join code - ADMIN/MANAGER
router.post("/rooms/create-with-code", requireRole(["ADMIN", "MANAGER"]), chatController.createRoomWithCode);

// Join room by code - All authenticated users
router.post("/rooms/join-by-code", chatController.joinRoomByCode);

// Regenerate join code - ADMIN/MANAGER (room owner)
router.post("/rooms/:id/regenerate-code", requireRole(["ADMIN", "MANAGER"]), chatController.regenerateJoinCode);

// Admin chat with users - ADMIN/MANAGER
router.get("/chat/messages/:userId", requireRole(["ADMIN", "MANAGER"]), chatController.getAdminChatMessages);
router.post("/chat/messages/:userId", requireRole(["ADMIN", "MANAGER"]), chatController.sendAdminChatMessage);
router.delete("/chat/messages/:messageId", requireRole(["ADMIN", "MANAGER"]), chatController.deleteAdminChatMessage);

export default router;
