import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      root: 'client',
      server: {
        port: 5000,
        strictPort: true,
        host: '0.0.0.0',
        proxy: {
          '^/api/.*': {
            target: 'http://localhost:5001',
            changeOrigin: true,
            secure: false,
          },
          '/socket.io': {
            target: 'ws://localhost:5001',
            ws: true,
          },
          '^/uploads/.*': {
            target: 'http://localhost:5001',
            changeOrigin: true,
            secure: false,
          },
        },
      },
      plugins: [react(), tailwindcss()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, 'client'),
        },
      },
    };
});
