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


import { connectDB } from './configs/db.js';
import passport from './configs/passport.js';
import { errorHandler, notFound } from './middleware/auth.js';
import { ipFilterMiddleware } from './middleware/ipFilter.js';
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
  const allowedOrigins = [
    "http://localhost:5173",
    "http://localhost:5000",
    "http://localhost:3000",
    "https://zerotrust.io.vn"
  ];
  
  app.use(cors({
    origin: function (origin, callback) {
      console.log("🌍 Origin:", origin);
  
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.log("❌ Blocked by CORS:", origin);
        callback(null, true); // ⚠️ TẠM CHO QUA để test
      }
    },
    credentials: true
  }));
  app.use(passport.initialize());

  // Removed Global Rate Limiting as requested due to internal network shared IP

  // 4a. Security headers — Helmet
  app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    crossOriginOpenerPolicy: { policy: 'same-origin' },
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com", "https://esm.sh", "https://accounts.google.com", "https://static.cloudflareinsights.com"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        imgSrc: ["'self'", "data:", "blob:", "http://localhost:*", "https://lh3.googleusercontent.com", "https://picsum.photos", "https://fastly.picsum.photos", "https://api.dicebear.com", "https://www.gstatic.com"],
        fontSrc: ["'self'", "data:", "https://fonts.gstatic.com"],
        connectSrc: ["'self'", "https://esm.sh", "https://accounts.google.com", "ws://localhost:5000", "ws://localhost:5173", "wss://localhost:5000", "https://cloudflareinsights.com"],
        frameSrc: ["'self'", "https://accounts.google.com"],
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
  
  // IP Filter & Geo-blocking middleware for APIs
  app.use('/api', ipFilterMiddleware);

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