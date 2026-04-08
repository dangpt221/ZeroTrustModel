import express from 'express';
import { requireAuth, requireRole, requirePermission } from '../middleware/auth.js';
import {
  createNotification,
  broadcastNotification,
  getAllNotifications,
  getMyNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
  deleteNotification
} from '../controllers/notificationController.js';

export function registerNotificationRoutes(router) {
  // Admin routes
  router.post('/notifications', requireAuth, requirePermission(['NOTIF_SEND']), createNotification);
  router.post('/notifications/broadcast', requireAuth, requirePermission(['NOTIF_SEND']), broadcastNotification);
  router.get('/notifications/all', requireAuth, requirePermission(['NOTIF_SEND']), getAllNotifications);
  router.delete('/notifications/:notificationId', requireAuth, requirePermission(['NOTIF_SEND']), deleteNotification);

  // User routes
  router.get('/notifications', requireAuth, getMyNotifications);
  router.get('/notifications/unread-count', requireAuth, getUnreadCount);
  router.put('/notifications/:notificationId/read', requireAuth, markAsRead);
  router.put('/notifications/read-all', requireAuth, markAllAsRead);
}

