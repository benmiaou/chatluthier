import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        privacy: path.resolve(__dirname, 'src/pages/privacy.html'),
        about: path.resolve(__dirname, 'src/pages/about.html'),
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    hmr: {
      protocol: 'ws', // WebSocket protocol
      host: 'localhost',
      port: 3000, // Same as your dev server port
    },
    port: 3000,
      proxy: {
        '/api': {
            target: 'http://localhost:5000', // Backend server URL
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/api/, ''), // Remove `/api` prefix before forwarding
        },
    },
  },
});
