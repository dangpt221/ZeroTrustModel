import express from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import {
  createNotification,
  broadcastNotification,
  getAllNotifications,
  getMyNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadCount
} from '../controllers/notificationController.js';

export function registerNotificationRoutes(router) {
  // Admin routes
  router.post('/notifications', requireRole(['ADMIN']), createNotification);
  router.post('/notifications/broadcast', requireRole(['ADMIN']), broadcastNotification);
  router.get('/notifications/all', requireRole(['ADMIN']), getAllNotifications);

  // User routes
  router.get('/notifications', requireAuth, getMyNotifications);
  router.get('/notifications/unread-count', requireAuth, getUnreadCount);
  router.put('/notifications/:notificationId/read', requireAuth, markAsRead);
  router.put('/notifications/read-all', requireAuth, markAllAsRead);
}

