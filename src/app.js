/**
 * app.js — Application bootstrap
 * Khởi tạo Express, middleware, routes, WebSocket.
 */

import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import helmet from 'helmet';
import mongoSanitize from 'express-mongo-sanitize';
import xss from 'xss-clean';
import rateLimit from 'express-rate-limit';

import { connectDB } from './configs/db.js';
import passport from './configs/passport.js';
import { errorHandler, notFound } from './middleware/auth.js';
import { registerRoutes } from './routes/index.js';
import { registerSocketHandlers } from './services/socket.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function createApp() {
  // 1. Connect MongoDB
  await connectDB();

  // 2. Express + HTTP server
  const app = express();
  const httpServer = createServer(app);

  // Trust proxy - important for getting real IP behind nginx/proxy
  app.set('trust proxy', 1);

  // 3. Socket.io
  const io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
      credentials: false
    },
  });
  app.set('io', io); // Store io so routes can access via req.app.get('io')

  // 4. Global middleware
  app.use(express.json({ limit: '1mb' })); // Reduced from 10mb to prevent Memory exhaustion DoS
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));
  app.use(cookieParser());
  
  // CORS Configuration
  const allowedOrigins = process.env.NODE_ENV === 'production' 
    ? [process.env.FRONTEND_URL || 'http://localhost:5000']
    : ['http://localhost:5000', 'http://localhost:5173'];
    
  app.use(cors({ 
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) === -1) {
        var msg = 'The CORS policy for this site does not allow access from the specified Origin.';
        return callback(new Error(msg), false);
      }
      return callback(null, true);
    }, 
    credentials: true // Allow cookies
  }));
  app.use(passport.initialize());

  // Global Rate Limiting to prevent API Abuse / DDoS
  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 300, // limit each IP to 300 requests per windowMs
    message: 'Too many requests from this IP, please try again after 15 minutes',
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  });
  app.use('/api/', apiLimiter);

  // 4a. Security headers — Helmet
  app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    crossOriginOpenerPolicy: { policy: 'same-origin' },
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com", "https://esm.sh"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        imgSrc: ["'self'", "data:", "blob:", "http://localhost:*", "https://lh3.googleusercontent.com"],
        fontSrc: ["'self'", "data:", "https://fonts.gstatic.com"],
        connectSrc: ["'self'", "https://esm.sh"],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
    noSniff: true,
    xssFilter: true,
    hidePoweredBy: true,
    ieNoOpen: true,
    frameguard: { action: 'deny' },
  }));

  // 4b. Sanitization — chống NoSQL injection & XSS
  app.use(mongoSanitize({
    replaceWith: '_',
    onSanitize: (req, res, next) => {
      console.warn('[SECURITY] MongoDB sanitize blocked potentially dangerous input:', req.path);
      next();
    }
  }));
  app.use(xss());

  // Serve uploaded files
  app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

  // 5. API Routes
  registerRoutes(app, io);

  // 6. WebSocket handlers
  registerSocketHandlers(io);

  // Serve Production Frontend
  const clientDistPath = path.join(__dirname, '../client/dist');
  app.use(express.static(clientDistPath));

  app.use((req, res, next) => {
    if (req.method !== 'GET') return next();
    if (req.originalUrl.startsWith('/api') || req.originalUrl.startsWith('/socket.io')) {
      return next(); // Let API and Socket 404 handlers take over
    }
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });

  // 7. 404 + Error handlers (sau routes)
  app.use(notFound);
  app.use(errorHandler);

  return { app, httpServer, io };
}

export async function startServer(
  port = process.env.PORT || 5000,
) {
  const { httpServer } = await createApp();

  httpServer.listen(port, () => {
    console.log(` HTTP server listening on port ${port}`);
  });
}