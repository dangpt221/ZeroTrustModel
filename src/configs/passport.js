import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { User } from '../models/User.js';

// No serialize/deserialize needed because we will use JWT instead of sessions
// but passport-google-oauth20 might require it if not configured to be stateless.
// We'll configure auth route to { session: false }

passport.use(
    new GoogleStrategy(
        {
            clientID: process.env.GOOGLE_CLIENT_ID || 'PLACEHOLDER_ID',
            clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'PLACEHOLDER_SECRET',
            callbackURL: '/api/auth/google/callback',
            proxy: true // Trust proxy if we are behind a reverse proxy/load balancer
        },
        async (accessToken, refreshToken, profile, done) => {
            try {
                const email = profile.emails && profile.emails[0] ? profile.emails[0].value : null;

                if (!email) {
                    return done(new Error('Email is required from Google profile'), null);
                }

                // 1. Try to find user by Google ID
                let user = await User.findOne({ googleId: profile.id });

                if (user) {
                    return done(null, user);
                }

                // 2. Try to find user by email (in case they already exist but haven't linked Google)
                user = await User.findOne({ email });

                if (user) {
                    // Link Google account to existing user
                    user.googleId = profile.id;
                    if (profile.photos && profile.photos[0] && !user.avatar) {
                        user.avatar = profile.photos[0].value;
                    }
                    await user.save();
                    return done(null, user);
                }

                // 3. Create a new user if they don't exist
                user = await User.create({
                    googleId: profile.id,
                    name: profile.displayName,
                    email: email,
                    passwordHash: 'GOOGLE_AUTH_NO_PASSWORD', // Required field, dummy value
                    avatar: profile.photos && profile.photos[0] ? profile.photos[0].value : null,
                    role: 'STAFF', // Default role
                    trustScore: 90,
                    isLocked: false,
                    mfaEnabled: false
                });

                return done(null, user);
            } catch (err) {
                return done(err, null);
            }
        }
    )
);

export default passport;
