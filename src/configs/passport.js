import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { User } from '../models/User.js';
import dotenv from 'dotenv';

dotenv.config();

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

// Google OAuth Strategy
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL || "/api/auth/google/callback",
    passReqToCallback: true
  },
  async (req, accessToken, refreshToken, profile, done) => {
    try {
      // Check if user already exists
      let user = await User.findOne({ googleId: profile.id });

      if (!user) {
        // Create new user (Google OAuth users get a placeholder password)
        const { hashPassword } = await import('../middleware/auth.js');
        user = await User.create({
          googleId: profile.id,
          email: profile.emails[0].value,
          name: profile.displayName,
          passwordHash: await hashPassword('google_oauth_placeholder'),
          avatar: profile.photos[0]?.value,
          role: 'STAFF',
          isApproved: false, // Require Admin approval
          mfaEnabled: false,
          status: 'PENDING', // Treat as new registration needing approval
          trustScore: 50 // Default trust score for new unverified devices
        });

        // Notify all admins about the new registration
        try {
          const admins = await User.find({ role: 'ADMIN' });
          if (admins.length > 0) {
            const { Notification } = await import('../models/Notification.js');
            const notifications = admins.map(admin => ({
              userId: admin._id,
              title: 'Yêu cầu phê duyệt mới',
              message: `Người dùng ${user.name} (${user.email}) vừa đăng ký bằng Google và đang chờ phê duyệt.`,
              type: 'ALERT',
              priority: 'HIGH',
              link: '/admin/users'
            }));
            await Notification.insertMany(notifications);
            
            const io = req.app?.get('io');
            if (io) {
              admins.forEach(admin => {
                io.to(`user_${admin._id.toString()}`).emit('notification', {
                  title: 'Yêu cầu phê duyệt mới',
                  message: `Người dùng ${user.name} (${user.email}) vừa đăng ký bằng Google và đang chờ phê duyệt.`,
                  type: 'ALERT',
                  priority: 'HIGH',
                  link: '/admin/users'
                });
              });
            }
          }
        } catch (notifyErr) {
          console.error("Failed to notify admins of new registration:", notifyErr);
        }
      }

      return done(null, user);
    } catch (err) {
      return done(err, null);
    }
  }));
}

export default passport;
