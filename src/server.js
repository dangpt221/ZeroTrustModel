/**
 * server.js — Entry point
 * Chạy: node src/server.js hoặc npm run dev
 */

import 'dotenv/config';
import { createApp } from './app.js';
import { PORT } from './config.js';


async function main() {
  try {
    const { httpServer } = await createApp();

    httpServer.listen(PORT, '0.0.0.0', () => {
      console.log('\n');
      console.log('Nexus Zero Trust API  — READY');
      console.log('');
      console.log(`  http://localhost:${PORT}   `);
      console.log('   MongoDB + Express + Socket.io ');
      console.log('\n');
    });

    // Graceful shutdown
    const shutdown = async (signal) => {
      console.log(`\n${signal} received. Shutting down gracefully...`);
      httpServer.close(() => {
        console.log('HTTP server closed.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

main();