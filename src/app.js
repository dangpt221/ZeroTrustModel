/**
 * app.js — Application bootstrap
 * Khởi tạo Express, middleware, routes, WebSocket.
 */

import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';

import { connectDB } from './configs/db.js';
import { errorHandler, notFound } from './middleware/auth.js';
import { registerRoutes } from './routes/index.js';
import { registerSocketHandlers } from './services/socket.js';

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

  // 5. API Routes
  registerRoutes(app, io);

  // 6. WebSocket handlers
  registerSocketHandlers(io);

  // 7. 404 + Error handlers (sau routes)
  app.use(notFound);
  app.use(errorHandler);

  return { app, httpServer, io };
}