import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import './css/styles.css';
import './css/notificationFix.css';

import { MantineProvider, ColorSchemeScript } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { ModalsProvider } from '@mantine/modals';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { theme } from './theme';
import { AuthProvider } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';
import { SETTINGS } from './constants/settings';

createRoot(document.getElementById('root')!).render(
  <>
    <ColorSchemeScript defaultColorScheme="dark" />
    <MantineProvider theme={theme} defaultColorScheme="dark">
      <ModalsProvider>
        <Notifications 
          position="top-right"
          styles={{
            root: {
              top: 0, // Position below header
              zIndex: 50  // High enough to show above content, low enough not to block
            }
          }}
        />
        <AuthProvider>
          <SocketProvider>
            <App />
          </SocketProvider>
        </AuthProvider>
      </ModalsProvider>
    </MantineProvider>
  </>
);
