import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { signUserToken, setAuthCookie, clearAuthCookie } from '../middleware/auth.js';

function toClientUser(user) {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    departmentId: user.departmentId || null,
    trustScore: user.trustScore ?? 95,
  };
}

export function registerAuthRoutes(router) {
  router.post('/auth/login', async (req, res, next) => {
    try {
      const { email, password } = req.body;
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      const ok = await bcrypt.compare(password || '', user.passwordHash);
      if (!ok) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      const token = signUserToken(user);
      setAuthCookie(res, token);

      res.json({ user: toClientUser(user) });
    } catch (err) {
      next(err);
    }
  });

  router.post('/auth/logout', async (_req, res) => {
    clearAuthCookie(res);
    res.json({ message: 'Logged out' });
  });
}

