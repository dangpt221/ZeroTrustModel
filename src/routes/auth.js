import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { clearAuthCookie, requireAuth, setAuthCookie, signUserToken } from '../middleware/auth.js';
import {
  assessLoginRisk,
  clearFailedAttempts,
  getClientIP,
  getDeviceFingerprint,
  logSecurityEvent,
  parseDeviceFromUserAgent,
  recordFailedAttempt,
  securityCheck
} from '../middleware/securityMiddleware.js';
import { User } from '../models/User.js';
import { ZeroTrustConfig } from '../models/ZeroTrustConfig.js';
import { sendOTP } from '../utils/emailService.js';

const ONLINE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

function toClientUser(user) {
  const lastActiveAt = user.lastActiveAt ? new Date(user.lastActiveAt).getTime() : null;
  const isOnline = lastActiveAt && Date.now() - lastActiveAt < ONLINE_THRESHOLD_MS;
  // Handle both populated and non-populated department
  const departmentName = user.departmentId?.name || (typeof user.departmentId === 'string' ? '' : user.departmentId) || '';
  // Normalize role to uppercase for consistency
  const normalizedRole = user.role?.toUpperCase();
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: normalizedRole,
    avatar: user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`,
    mfaEnabled: user.mfaEnabled || false,
    department: departmentName || 'Phòng ban chung',
    lastLogin: user.updatedAt || new Date().toISOString(),
    trustScore: user.trustScore ?? 95,
    ipAddress: '192.168.1.105',
    device: user.device || 'Chưa xác định',
    status: user.status || (user.isLocked ? 'LOCKED' : 'ACTIVE'),
    departmentId: user.departmentId?._id?.toString() || user.departmentId || null,
    lastActiveAt: user.lastActiveAt ? new Date(user.lastActiveAt).toISOString() : null,
    isOnline: !!isOnline,
    permissions: user.customRoles?.flatMap(r => r.permissions || []) || [],
    hasPasswordSet: user.hasPasswordSet !== false // Default true unless explicitly false (Google Auth)
  };
}

async function updateUserActivity(user, req, forceDevice = false) {
  const now = new Date();
  const ua = req?.headers?.['user-agent'] || '';
  if (forceDevice || !user.device) {
    user.device = parseDeviceFromUserAgent(ua) || user.device;
  }
  // Throttle: only update lastActiveAt if older than 1 min (avoid DB spam on every auth/me)
  const lastActive = user.lastActiveAt ? new Date(user.lastActiveAt).getTime() : 0;
  if (forceDevice || Date.now() - lastActive > 60 * 1000) {
    user.lastActiveAt = now;
    await user.save();
  }
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
        const user = await User.findById(pending.userId).populate('customRoles');
        if (!user || user.isLocked) {
          mfaPendingLogins.delete(email);
          logSecurityEvent('LOGIN_BLOCKED', { email, ip: clientIP, reason: 'Locked account' });
          return res.status(401).json({ message: 'Account locked or not found' });
        }

        // If it was a NEW_DEVICE, add to knownDevices
        if (pending.riskFactors && pending.riskFactors.includes('NEW_DEVICE')) {
          if (!user.knownDevices) user.knownDevices = [];
          if (!user.knownDevices.includes(deviceFingerprint)) {
            user.knownDevices.push(deviceFingerprint);
            await user.save();
            logSecurityEvent('DEVICE_REGISTERED', { email, deviceFingerprint });
          }
        }

        mfaPendingLogins.delete(email);

        // Risk assessment after successful MFA
        const { riskScore, riskFactors } = await assessLoginRisk(req, user);

        await updateUserActivity(user, req, true);

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
      const user = await User.findOne({ email }).populate('customRoles');
      if (!user) {
        recordFailedAttempt(clientIP, email);
        logSecurityEvent('LOGIN_FAILED', { email, ip: clientIP, reason: 'User not found' });
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      if (user.isLocked) {
        logSecurityEvent('LOGIN_BLOCKED', { email: user.email, ip: clientIP, reason: 'Account locked' });
        return res.status(401).json({ message: 'Account is locked' });
      }

      if (user.status === 'PENDING') {
        return res.status(403).json({
          message: 'Account pending approval',
          user: toClientUser(user),
          needsApproval: true
        });
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

      // Assess Login Risk
      const { riskScore, riskFactors } = await assessLoginRisk(req, user);

      let ztConfig;
      try {
        ztConfig = await ZeroTrustConfig.findOne();
      } catch (e) {
        console.error("Error fetching ZeroTrustConfig", e);
      }
      
      const globalMfa = ztConfig?.mfaRequired || false;
      const adminMfa = (ztConfig?.mfaRequiredForAdmins && user.role === 'ADMIN');
      const shouldForceOTP = user.mfaEnabled || globalMfa || adminMfa;

      if (shouldForceOTP) {
        // Generate a 6-digit OTP
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

        // Send OTP via Email
        const emailSent = await sendOTP(user.email, otpCode);

        mfaPendingLogins.set(email, {
          userId: user._id.toString(),
          mfaCode: otpCode,
          expiresAt: Date.now() + 5 * 60 * 1000,
          riskScore,
          riskFactors
        });

        logSecurityEvent('MFA_ENFORCED', {
          email,
          ip: clientIP,
          riskScore,
          riskFactors,
          message: 'Zero Trust: OTP mandatory for all logins',
          emailSent
        });

        return res.json({
          needsMFA: true,
          message: 'Xác thực bảo mật là bắt buộc (Zero Trust). Mã xác thực đã được gửi đến email của bạn.',
          riskScore,
          riskFactors
        });
      }

      // Clear failed attempts on success (In case we reached here without MFA, though shouldn't happen with shouldForceOTP=true)
      clearFailedAttempts(clientIP, email);

      await updateUserActivity(user, req, true);

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
      console.log('[auth/me] req.user:', req.user);
      if (!req.user || !req.user.id) {
        return res.status(401).json({ message: 'Invalid token' });
      }

      let user;
      try {
        user = await User.findById(req.user.id)
          .populate('departmentId', 'name')
          .populate('customRoles');
      } catch (popErr) {
        console.error('[auth/me] populate error:', popErr);
        user = await User.findById(req.user.id).populate('customRoles');
      }

      console.log('[auth/me] user found:', user ? user.email : 'null');

      if (!user) return res.status(404).json({ message: 'User not found' });

      // Update activity
      try {
        const ua = req?.headers?.['user-agent'] || '';
        const now = new Date();
        if (!user.device) {
          user.device = parseDeviceFromUserAgent(ua) || user.device;
        }
        const lastActive = user.lastActiveAt ? new Date(user.lastActiveAt).getTime() : 0;
        if (Date.now() - lastActive > 60 * 1000) {
          user.lastActiveAt = now;
        }

        // Automatic DB fix for legacy Google users
        if (user.googleId && user.hasPasswordSet !== false) {
          const isPlaceholder = await bcrypt.compare('google_oauth_placeholder', user.passwordHash);
          if (isPlaceholder) {
            user.hasPasswordSet = false;
          }
        }
        
        await user.save();
      } catch (saveErr) {
        console.error('[auth/me] save error:', saveErr);
      }

      console.log(`[AUTH_CHECK] User: ${user.email}, Status: ${user.status || 'N/A'}`);

      // Refresh JWT token so newly assigned permissions are embedded in the cookie
      const newToken = signUserToken(user);
      setAuthCookie(res, newToken);

      res.json(toClientUser(user));
    } catch (err) {
      console.error('[auth/me] ERROR:', err);
      res.status(500).json({ message: err.message });
    }
  });

  router.put('/auth/profile', requireAuth, async (req, res) => {
    try {
      const { name, avatar, currentPassword, newPassword, mfaEnabled } = req.body;
      const user = await User.findById(req.user.id);

      if (newPassword) {
        if (user.hasPasswordSet === false) {
            // First time setting password (User registered with Google Auth)
            user.passwordHash = await bcrypt.hash(newPassword, 10);
            user.hasPasswordSet = true;
        } else {
            // Standard password change
            if (!currentPassword) {
                return res.status(400).json({ message: 'Vui lòng nhập mật khẩu hiện tại' });
            }
            const ok = await bcrypt.compare(currentPassword, user.passwordHash);
            if (!ok) {
                return res.status(400).json({ message: 'Mật khẩu hiện tại không chính xác' });
            }
            user.passwordHash = await bcrypt.hash(newPassword, 10);
        }
      }

      if (name) user.name = name;
      if (avatar !== undefined) user.avatar = avatar;
      if (typeof mfaEnabled === 'boolean') user.mfaEnabled = mfaEnabled;
      await user.save();

      // Refresh token if MFA status or other sensitive info changed
      const newToken = signUserToken(user);
      setAuthCookie(res, newToken);

      res.json(toClientUser(user));
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  });

};
