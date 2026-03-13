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

  // 3. Socket.io
  const io = new Server(httpServer, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
  });

  // 4. Global middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());
  app.use(cors({ origin: '*', credentials: true }));
  app.use(passport.initialize());

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