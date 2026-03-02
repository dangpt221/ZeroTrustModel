import express from "express";
import { authMiddleware } from "../middleware/auth.js";
import { registerAuthRoutes } from "./auth.js";
import usersRouter from "./users.js";
import departmentsRouter from "./departments.js";
import projectsRouter from "./projects.js";
import teamsRouter from "./teams.js";
import documentsRouter from "./documents.js";
import chatManagementRouter from "./chatManagement.js";
import { registerAttendanceRoutes } from "./attendance.js";
import { registerMessageRoutes } from "./messages.js";
import { registerZeroTrustRoutes } from "./zeroTrust.js";
import { registerAuditLogRoutes } from "./auditLogs.js";
import { registerNotificationRoutes } from "./notificationRoutes.js";
import rolesRouter from "./roles.js";
import passport from "../configs/passport.js";

export function registerRoutes(app, io) {
  const router = express.Router();

  // Google OAuth routes - must be BEFORE authMiddleware
  router.get("/auth/google", passport.authenticate("google", { scope: ["profile", "email"], session: false }));

  // Google OAuth Callback - with proper token generation
  router.get(
    "/auth/google/callback",
    passport.authenticate("google", { session: false, failureRedirect: "/#/login?error=GoogleAuthFailed" }),
    async (req, res) => {
      try {
        const user = req.user;
        const { signUserToken, setAuthCookie } = await import('../middleware/auth.js');

        if (!user || user.isLocked) {
          return res.redirect(`${process.env.FRONTEND_URL || "http://localhost:5173"}/#/login?error=AccountLocked`);
        }

        // Generate JWT token
        const token = signUserToken(user);
        setAuthCookie(res, token);

        res.redirect(`${process.env.FRONTEND_URL || "http://localhost:5173"}/#/`);
      } catch (err) {
        console.error('OAuth callback error:', err);
        res.redirect(`${process.env.FRONTEND_URL || "http://localhost:5173"}/#/login?error=InternalError`);
      }
    }
  );

  // Auth middleware for all other routes
  router.use(authMiddleware);
  router.use((req, res, next) => {
    req.app.set("io", io);
    next();
  });

  registerAuthRoutes(router);

  // Chat management router with /chat prefix
  const chatRouter = express.Router();
  chatRouter.use(chatManagementRouter);
  router.use('/chat', chatRouter);

  router.use(usersRouter);
  router.use(rolesRouter);
  router.use(departmentsRouter);
  router.use(projectsRouter);
  router.use(teamsRouter);
  router.use(documentsRouter);
  registerAttendanceRoutes(router);
  registerMessageRoutes(router);
  registerZeroTrustRoutes(router);
  registerAuditLogRoutes(router);
  registerNotificationRoutes(router);

  app.use("/api", router);
}
