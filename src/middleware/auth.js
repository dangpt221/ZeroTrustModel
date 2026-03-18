import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-zero-trust-secret';
const COOKIE_NAME = 'auth_token';

export async function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

export function authMiddleware(req, _res, next) {
  try {
    const token =
      req.cookies?.[COOKIE_NAME] ||
      (req.headers.authorization || '').replace('Bearer ', '');

    if (!token) {
      req.user = null;
      return next();
    }

    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch {
    req.user = null;
    next();
  }
}

export function requireAuth(req, res, next) {
  if (!req.user) {
    console.log('[requireAuth] No user found, returning 401');
    return res.status(401).json({ message: 'Unauthorized' });
  }
  console.log('[requireAuth] User:', req.user.email, 'Role:', req.user.role);
  next();
}

export function requireRole(roles = []) {
  return (req, res, next) => {
    console.log('[requireRole] Checking role. User role:', req.user?.role, 'Required:', roles);
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    if (!roles.includes(req.user.role)) {
      console.log('[requireRole] Role not matching. User role:', req.user.role, 'Required:', roles);
      return res.status(403).json({ message: 'Forbidden' });
    }
    next();
  };
}

export function signUserToken(user) {
  // Handle departmentId - convert to string if it's an object (populated)
  let deptId = user.departmentId;
  if (deptId && typeof deptId === 'object' && deptId._id) {
    deptId = deptId._id.toString();
  } else if (deptId && typeof deptId === 'object' && deptId.toString) {
    deptId = deptId.toString();
  }

  return jwt.sign(
    {
      id: user._id?.toString?.() || user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      departmentId: deptId || null,
      trustScore: user.trustScore ?? 95,
    },
    JWT_SECRET,
    { expiresIn: '12h' },
  );
}

export function setAuthCookie(res, token) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: false,
    maxAge: 12 * 60 * 60 * 1000,
  });
}

export function clearAuthCookie(res) {
  res.clearCookie(COOKIE_NAME);
}

export function notFound(_req, res, _next) {
  res.status(404).json({ message: 'Route not found' });
}

export function errorHandler(err, _req, res, _next) {
  console.error('API error:', err);
  const status = err.status || 500;
  res.status(status).json({
    message: err.message || 'Internal server error',
  });
}

