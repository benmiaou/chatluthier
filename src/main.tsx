import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import './css/styles.css';
import './css/notificationFix.css';

import { MantineProvider, ColorSchemeScript } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { ModalsProvider } from '@mantine/modals';
import { createRoot } from 'react-dom/client';
import * as Sentry from '@sentry/react';
import App from './App';
import { theme } from './theme';
import { AuthProvider } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';

// Initialize Sentry Error Monitoring
if (import.meta.env.MODE === 'production') {
  Sentry.init({
    dsn: import.meta.env.VITE_REACT_APP_SENTRY_DSN,
    integrations: [Sentry.replayIntegration()],
    tracesSampleRate: 1,
    environment: import.meta.env.MODE,
  });
}

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
            <Sentry.ErrorBoundary
              fallback={() => (
                <div className="error-fallback">
                  <h2>Something went wrong</h2>
                  <p>We&apos;ve been notified of this issue and will fix it soon.</p>
                  <button onClick={() => globalThis.location.reload()}>Reload Page</button>
                </div>
              )}
            >
              <App />
            </Sentry.ErrorBoundary>
          </SocketProvider>
        </AuthProvider>
      </ModalsProvider>
    </MantineProvider>
  </>
);
