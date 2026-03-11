import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig(() => {
  const backendUrl = `http://localhost:${process.env.BACKEND_PORT ?? '3000'}`;
  const makeProxy = () => ({ target: backendUrl, changeOrigin: true });
  return {
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
        '/api/sounds/backgroundMusic': makeProxy(),
        '/api/sounds/ambianceSounds': makeProxy(),
        '/api/sounds/soundboard': makeProxy(),
        '/api/sounds': makeProxy(),
        '/backgroundMusic': makeProxy(),
        '/ambianceSounds': makeProxy(),
        '/soundboard': makeProxy(),
        '/verify-login': makeProxy(),
        '/logout': makeProxy(),
        '/refresh-token': makeProxy(),
        '/check-session': makeProxy(),
        '/save-preset': makeProxy(),
        '/load-presets': makeProxy(),
        '/delete-sound': makeProxy(),
        '/update-main-playlist': makeProxy(),
        '/update-user-sound': makeProxy(),
        '/add-sound': makeProxy(),
        '/request-sound': makeProxy(),
        '/get-requests': makeProxy(),
        '/close-request': makeProxy(),
        '/get-sound-order': makeProxy(),
        '/save-sound-order': makeProxy(),
        '/contexts': makeProxy(),
        '/register': makeProxy(),
        '/login': makeProxy(),
        '/request-password-reset': makeProxy(),
        '/get-secret-question': makeProxy(),
        '/check-pseudo-available': makeProxy(),
        '/change-password': makeProxy(),
      },
    },
    css: {
      preprocessorOptions: {
        scss: {
          additionalData: '@import "@mantine/core/styles.css";',
        },
      },
    },
  };
});
