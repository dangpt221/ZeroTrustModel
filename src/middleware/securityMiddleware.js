/**
 * Security Middleware for Zero Trust Login
 * - Rate Limiting
 * - IP Blocking
 * - Device Fingerprinting
 * - Risk-based Authentication
 */

// In-memory stores (use Redis in production)
const loginAttempts = new Map();      // Track failed login attempts by IP/email
const blockedIPs = new Map();           // Blocked IPs
const deviceSessions = new Map();      // Track device sessions

// Configuration
const MAX_LOGIN_ATTEMPTS = 5;          // Max failed attempts before blocking
const BLOCK_DURATION = 15 * 60 * 1000; // Block duration: 15 minutes
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // Rate limit window: 15 minutes

/**
 * Check if IP is blocked
 */
export function isIPBlocked(ip) {
  const block = blockedIPs.get(ip);
  if (!block) return false;

  if (Date.now() > block.expiresAt) {
    blockedIPs.delete(ip);
    return false;
  }
  return true;
}

/**
 * Block an IP address
 */
function blockIP(ip, reason) {
  blockedIPs.set(ip, {
    expiresAt: Date.now() + BLOCK_DURATION,
    reason,
    attempts: 0
  });
  console.log(`[SECURITY] IP ${ip} blocked for ${BLOCK_DURATION / 60000} minutes - ${reason}`);
}

/**
 * Record failed login attempt
 */
export function recordFailedAttempt(ip, email) {
  const key = `${ip}:${email}`;
  const attempts = loginAttempts.get(key) || {
    count: 0,
    firstAttempt: Date.now(),
    lastAttempt: null,
    ip
  };

  attempts.count++;
  attempts.lastAttempt = Date.now();
  loginAttempts.set(key, attempts);

  // Check if should block IP
  if (attempts.count >= MAX_LOGIN_ATTEMPTS) {
    blockIP(ip, `Too many failed login attempts (${attempts.count})`);
  }

  return attempts.count;
}

/**
 * Clear failed login attempts after successful login
 */
export function clearFailedAttempts(ip, email) {
  const key = `${ip}:${email}`;
  loginAttempts.delete(key);
}

/**
 * Get client IP from request
 */
export function getClientIP(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.headers['x-real-ip'] ||
    req.connection?.remoteAddress ||
    req.socket?.remoteAddress ||
    'unknown';
}

/**
 * Generate device fingerprint
 */
export function getDeviceFingerprint(req) {
  const userAgent = req.headers['user-agent'] || '';
  const acceptLanguage = req.headers['accept-language'] || '';
  const ip = getClientIP(req);

  // Simple fingerprint based on available headers
  // In production, use a proper fingerprinting library
  const fingerprint = Buffer.from(
    `${ip}:${userAgent}:${acceptLanguage}`
  ).toString('base64').slice(0, 32);

  return fingerprint;
}

/**
 * Security check middleware for login endpoint
 */
export function securityCheck(req, res, next) {
  const ip = getClientIP(req);

  // Check if IP is blocked
  if (isIPBlocked(ip)) {
    const block = blockedIPs.get(ip);
    const remainingMinutes = Math.ceil((block.expiresAt - Date.now()) / 60000);
    return res.status(429).json({
      message: 'Too many login attempts. Please try again later.',
      blocked: true,
      retryAfter: remainingMinutes
    });
  }

  // Rate limiting check
  const key = ip;
  const now = Date.now();
  const rateLimitData = loginAttempts.get(key) || { count: 0, windowStart: now };

  // Reset if window expired
  if (now - rateLimitData.windowStart > RATE_LIMIT_WINDOW) {
    rateLimitData.count = 0;
    rateLimitData.windowStart = now;
  }

  rateLimitData.count++;
  loginAttempts.set(key, rateLimitData);

  if (rateLimitData.count > 20) { // Max 20 requests per window
    return res.status(429).json({
      message: 'Rate limit exceeded. Please try again later.',
      rateLimited: true
    });
  }

  next();
}

/**
 * Risk Assessment for login
 * Returns risk score (0-100) and risk factors
 */
export async function assessLoginRisk(req, user) {
  const ip = getClientIP(req);
  const deviceFingerprint = getDeviceFingerprint(req);

  let riskScore = 0;
  const riskFactors = [];

  // Check 1: New device (not seen before)
  const isKnownDevice = user.knownDevices && user.knownDevices.includes(deviceFingerprint);
  if (!isKnownDevice) {
    riskScore += 30;
    riskFactors.push('NEW_DEVICE');
  }

  // Check 2: IP reputation (blocked IP)
  if (isIPBlocked(ip)) {
    riskScore += 100;
    riskFactors.push('BLOCKED_IP');
  }

  // Check 3: Failed login history
  const attemptKey = `${ip}:${user.email}`;
  const attempts = loginAttempts.get(attemptKey);
  if (attempts && attempts.count > 3) {
    riskScore += 20;
    riskFactors.push('RECENT_FAILED_ATTEMPTS');
  }

  // Check 4: Unusual login time (outside business hours)
  const hour = new Date().getHours();
  if (hour < 6 || hour > 22) {
    riskScore += 15;
    riskFactors.push('UNUSUAL_LOGIN_TIME');
  }

  // Check 5: Known high-risk IP ranges (simplified check)
  if (ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.')) {
    // Private IP - lower risk
    riskScore -= 10;
  }

  // Check 6: User account risk
  if (user.trustScore < 50) {
    riskScore += 25;
    riskFactors.push('LOW_TRUST_USER');
  }

  if (user.isLocked) {
    riskScore += 100;
    riskFactors.push('LOCKED_ACCOUNT');
  }

  // Clamp risk score
  riskScore = Math.max(0, Math.min(100, riskScore));

  return { riskScore, riskFactors };
}

/**
 * Log security event
 */
export function logSecurityEvent(eventType, data) {
  const log = {
    timestamp: new Date().toISOString(),
    eventType,
    ...data
  };
  console.log(`[SECURITY ${eventType}]`, JSON.stringify(log));
}
