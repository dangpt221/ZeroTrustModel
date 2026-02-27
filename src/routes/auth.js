import bcrypt from 'bcryptjs';
import { clearAuthCookie, requireAuth, setAuthCookie, signUserToken } from '../middleware/auth.js';
import {
  assessLoginRisk,
  clearFailedAttempts,
  getClientIP,
  getDeviceFingerprint,
  logSecurityEvent,
  recordFailedAttempt,
  securityCheck
} from '../middleware/securityMiddleware.js';
import passport from '../configs/passport.js';
import { User } from '../models/User.js';

function toClientUser(user) {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    // Map backend role 'STAFF' -> frontend enum 'MEMBER'
    role: user.role === 'STAFF' ? 'MEMBER' : user.role,
    avatar: user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`,
    mfaEnabled: user.mfaEnabled || false,
    department: user.department || 'Phòng ban chung',
    lastLogin: user.updatedAt || new Date().toISOString(),
    trustScore: user.trustScore ?? 95,
    ipAddress: '192.168.1.105', // Mock or get from req if possible (needs req arg)
    device: 'Chrome / Windows 11', // Mock
    status: user.isLocked ? 'LOCKED' : 'ACTIVE',
    departmentId: user.departmentId || null,
  };
}

// In-memory store for MFA temp tokens (in production, use Redis)
const mfaPendingLogins = new Map();

export function registerAuthRoutes(router) {
  // Apply security check to login endpoint
  router.post('/auth/login', securityCheck, async (req, res, next) => {
    try {
      const { email, password, mfaCode } = req.body;
      const clientIP = getClientIP(req);
      const deviceFingerprint = getDeviceFingerprint(req);

      // If MFA code provided, verify it
      if (mfaCode) {
        const pending = mfaPendingLogins.get(email);
        if (!pending || pending.mfaCode !== mfaCode) {
          recordFailedAttempt(clientIP, email);
          logSecurityEvent('MFA_FAILED', { email, ip: clientIP, deviceFingerprint });
          return res.status(401).json({ message: 'Invalid MFA code' });
        }

        // MFA verified, complete login
        const user = await User.findById(pending.userId);
        if (!user || user.isLocked) {
          mfaPendingLogins.delete(email);
          logSecurityEvent('LOGIN_BLOCKED', { email, ip: clientIP, reason: 'Locked account' });
          return res.status(401).json({ message: 'Account locked or not found' });
        }

        mfaPendingLogins.delete(email);

        // Risk assessment after successful MFA
        const { riskScore, riskFactors } = await assessLoginRisk(req, user);

        const token = signUserToken(user);
        setAuthCookie(res, token);

        // Log successful login
        logSecurityEvent('LOGIN_SUCCESS', {
          email: user.email,
          ip: clientIP,
          deviceFingerprint,
          riskScore,
          riskFactors,
          mfaVerified: true
        });

        return res.json({
          user: toClientUser(user),
          riskScore,
          riskFactors
        });
      }

      // Step 1: Verify email/password
      const user = await User.findOne({ email });
      if (!user) {
        recordFailedAttempt(clientIP, email);
        logSecurityEvent('LOGIN_FAILED', { email, ip: clientIP, reason: 'User not found' });
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      if (user.isLocked) {
        logSecurityEvent('LOGIN_BLOCKED', { email, ip: clientIP, reason: 'Account locked' });
        return res.status(401).json({ message: 'Account is locked' });
      }

      const ok = await bcrypt.compare(password || '', user.passwordHash);
      if (!ok) {
        const attempts = recordFailedAttempt(clientIP, email);
        logSecurityEvent('LOGIN_FAILED', {
          email,
          ip: clientIP,
          reason: 'Invalid password',
          attemptNumber: attempts
        });

        if (attempts >= 3) {
          return res.status(401).json({
            message: 'Invalid credentials',
            warning: `Cảnh báo: ${attempts} lần thử thất bại. Tài khoản sẽ bị khóa sau ${5 - attempts} lần thử nữa.`
          });
        }
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      // Risk assessment before login completion
      const { riskScore, riskFactors } = await assessLoginRisk(req, user);

      // High risk - force MFA regardless of user setting
      if (riskScore >= 50 || riskFactors.includes('NEW_DEVICE')) {
        // Generate a mock MFA code (in production, this would send real OTP)
        const mockMfaCode = '000000';
        mfaPendingLogins.set(email, {
          userId: user._id.toString(),
          mfaCode: mockMfaCode,
          expiresAt: Date.now() + 5 * 60 * 1000,
          riskScore,
          riskFactors
        });

        logSecurityEvent('RISK_DETECTED', {
          email,
          ip: clientIP,
          riskScore,
          riskFactors,
          action: 'MFA_FORCED'
        });

        return res.json({
          needsMFA: true,
          message: 'Xác thực bảo mật bổ sung được yêu cầu do phát hiện hoạt động bất thường',
          riskScore,
          riskFactors
        });
      }

      // Check if MFA is enabled
      if (user.mfaEnabled) {
        // Generate a mock MFA code (in production, this would send real OTP)
        const mockMfaCode = '000000';
        mfaPendingLogins.set(email, {
          userId: user._id.toString(),
          mfaCode: mockMfaCode,
          expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes
        });

        return res.json({
          needsMFA: true,
          message: 'MFA verification required'
        });
      }

      // Clear failed attempts on success
      clearFailedAttempts(clientIP, email);

      // No MFA, complete login
      const token = signUserToken(user);
      setAuthCookie(res, token);

      logSecurityEvent('LOGIN_SUCCESS', {
        email: user.email,
        ip: clientIP,
        deviceFingerprint,
        riskScore,
        riskFactors
      });

      res.json({
        user: toClientUser(user),
        riskScore,
        riskFactors
      });
    } catch (err) {
      next(err);
    }
  });

  router.post('/auth/logout', async (_req, res) => {
    clearAuthCookie(res);
    res.json({ message: 'Logged out' });
  });

  // Get current user profile
  router.get('/auth/me', requireAuth, async (req, res) => {
    try {
      const user = await User.findById(req.user.id).lean();
      if (!user) return res.status(404).json({ message: 'User not found' });
      res.json(toClientUser(user));
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  });

  // Update current user profile
  router.put('/auth/profile', requireAuth, async (req, res) => {
    try {
      const { name, currentPassword, newPassword } = req.body;
      const user = await User.findById(req.user.id);

      if (currentPassword && newPassword) {
        const ok = await bcrypt.compare(currentPassword, user.passwordHash);
        if (!ok) {
          return res.status(400).json({ message: 'Current password is incorrect' });
        }
        user.passwordHash = await bcrypt.hash(newPassword, 10);
      }

      if (name) user.name = name;
      await user.save();

      res.json(toClientUser(user));
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  });

  // ================= GOOGLE OAUTH ROUTES =================

  // 1. Kick off Google Auth
  router.get('/auth/google', passport.authenticate('google', {
    scope: ['profile', 'email'],
    session: false
  }));

  // 2. Google OAuth Callback
  router.get('/auth/google/callback',
    passport.authenticate('google', {
      session: false,
      failureRedirect: `${process.env.FRONTEND_URL || ''}/#/login?error=GoogleAuthFailed`
    }),
    async (req, res) => {
      try {
        // req.user will contain the authenticated user from passport.js
        const user = req.user;
        const clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown';
        const deviceFingerprint = req.headers['user-agent'] || 'unknown';

        if (!user || user.isLocked) {
          console.log('--- DEBUG OAUTH BLOCKED ---');
          console.log('User object:', user);
          console.log('IsLocked:', user?.isLocked);
          logSecurityEvent('LOGIN_BLOCKED', { email: user?.email || 'unknown', ip: clientIP, reason: 'Account locked or missing from OAuth' });
          return res.redirect(`${process.env.FRONTEND_URL || ''}/#/login?error=AccountLocked`);
        }

        // Generate JWT token
        const token = signUserToken(user);

        // Set cookie
        setAuthCookie(res, token);

        // Risk assessment for OAuth
        const { riskScore, riskFactors } = await assessLoginRisk(req, user);

        logSecurityEvent('LOGIN_SUCCESS', {
          email: user.email,
          ip: clientIP,
          deviceFingerprint,
          riskScore,
          riskFactors,
          authMethod: 'GOOGLE_OAUTH'
        });

        // Redirect back to frontend dashboard
        res.redirect(`${process.env.FRONTEND_URL || ''}/#/`);

      } catch (err) {
        console.error('Google OAuth Callback Error:', err);
        res.redirect(`${process.env.FRONTEND_URL || ''}/#/login?error=InternalError`);
      }
    }
  );
}
