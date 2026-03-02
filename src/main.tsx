import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import './css/styles.css';
import './css/notificationFix.css';

import { MantineProvider, ColorSchemeScript } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { ModalsProvider } from '@mantine/modals';
import { createRoot } from 'react-dom/client';
import App from './App';
import { theme } from './theme';
import { AuthProvider } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element not found');
}

createRoot(rootElement).render(
  <>
    <ColorSchemeScript defaultColorScheme="dark" />
    <MantineProvider theme={theme} defaultColorScheme="dark">
      <ModalsProvider>
        <Notifications
          position="top-right"
          styles={{
            root: {
              top: 0,
              zIndex: 50,
            },
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
