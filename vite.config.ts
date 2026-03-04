import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  root: '.',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'mantine-vendor': [
            '@mantine/core',
            '@mantine/hooks',
            '@mantine/modals',
            '@mantine/notifications',
          ],
          'icons-vendor': ['@tabler/icons-react'],
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/assets': { target: 'http://localhost:3000', changeOrigin: true },
      '/api/sounds/backgroundMusic': { target: 'http://localhost:3000', changeOrigin: true },
      '/api/sounds/ambianceSounds': { target: 'http://localhost:3000', changeOrigin: true },
      '/api/sounds/soundboard': { target: 'http://localhost:3000', changeOrigin: true },
      '/api/sounds': { target: 'http://localhost:3000', changeOrigin: true },
      '/backgroundMusic': { target: 'http://localhost:3000', changeOrigin: true },
      '/ambianceSounds': { target: 'http://localhost:3000', changeOrigin: true },
      '/soundboard': { target: 'http://localhost:3000', changeOrigin: true },
      '/verify-login': { target: 'http://localhost:3000', changeOrigin: true },
      '/logout': { target: 'http://localhost:3000', changeOrigin: true },
      '/refresh-token': { target: 'http://localhost:3000', changeOrigin: true },
      '/check-session': { target: 'http://localhost:3000', changeOrigin: true },
      '/save-preset': { target: 'http://localhost:3000', changeOrigin: true },
      '/load-presets': { target: 'http://localhost:3000', changeOrigin: true },
      '/delete-sound': { target: 'http://localhost:3000', changeOrigin: true },
      '/update-main-playlist': { target: 'http://localhost:3000', changeOrigin: true },
      '/update-user-sound': { target: 'http://localhost:3000', changeOrigin: true },
      '/add-sound': { target: 'http://localhost:3000', changeOrigin: true },
      '/request-sound': { target: 'http://localhost:3000', changeOrigin: true },
      '/get-requests': { target: 'http://localhost:3000', changeOrigin: true },
      '/close-request': { target: 'http://localhost:3000', changeOrigin: true },
      '/get-sound-order': { target: 'http://localhost:3000', changeOrigin: true },
      '/save-sound-order': { target: 'http://localhost:3000', changeOrigin: true },
      '/register': { target: 'http://localhost:3000', changeOrigin: true },
      '/login': { target: 'http://localhost:3000', changeOrigin: true },
      '/request-password-reset': { target: 'http://localhost:3000', changeOrigin: true },
      '/get-secret-question': { target: 'http://localhost:3000', changeOrigin: true },
      '/check-pseudo-available': { target: 'http://localhost:3000', changeOrigin: true },
      '/change-password': { target: 'http://localhost:3000', changeOrigin: true },
    },
  },
});
