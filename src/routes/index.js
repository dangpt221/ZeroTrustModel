import express from 'express';
import { authMiddleware, requireAuth, requireRole } from '../middleware/auth.js';
import { registerAuthRoutes } from './auth.js';
import { registerAdminRoutes } from './admin.js';
import { registerDepartmentRoutes } from './departments.js';
import { registerDocumentRoutes } from './documents.js';
import { registerProjectRoutes } from './projects.js';
import { registerTeamRoutes } from './teams.js';
import { registerAttendanceRoutes } from './attendance.js';
import { registerMessageRoutes } from './messages.js';
import { registerZeroTrustRoutes } from './zeroTrust.js';
import { registerAuditLogRoutes } from './auditLogs.js';
import { registerNotificationRoutes } from './notificationRoutes.js';

export function registerRoutes(app, io) {
  const router = express.Router();

  // Attach auth middleware for all /api routes
  router.use(authMiddleware);

  // Attach io to request for real-time notifications
  router.use((req, _res, next) => {
    req.app.set('io', io);
    next();
  });

  registerAuthRoutes(router);
  registerAdminRoutes(router);
  registerDepartmentRoutes(router);
  registerDocumentRoutes(router);
  registerProjectRoutes(router);
  registerTeamRoutes(router);
  registerAttendanceRoutes(router);
  registerMessageRoutes(router);
  registerZeroTrustRoutes(router);
  registerAuditLogRoutes(router);
  registerNotificationRoutes(router);

  app.use('/api', router);
}

