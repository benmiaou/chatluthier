// Load environment variables from .env file
require('dotenv').config();

const app = require('./app');
const http = require('node:http');
const server = http.createServer(app);
const db = require('./database/db');
const winstonLogger = require('./utils/logger');
const config = require('./config/appConfig');

let PORT = process.argv[2]
  ? Number.parseInt(process.argv[2])
  : Number.parseInt(process.env.PORT ?? '3000');
if (Number.isNaN(PORT) || PORT <= 0) {
  console.error(`Invalid port: ${process.argv[2]}, using default port 3000`);
  PORT = 3000;
}

// Initialize Winston logger
winstonLogger.info('Starting ChatLuthier server...');

// Wrap database methods to log SQL queries
const loggedDb = winstonLogger.wrapDatabaseMethods(db);

// Handle process termination gracefully
process.on('SIGINT', () => {
  winstonLogger.info('Received SIGINT, shutting down gracefully...');
  server.close(() => {
    winstonLogger.info('Server closed');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  winstonLogger.info('Received SIGTERM, shutting down gracefully...');
  server.close(() => {
    winstonLogger.info('Server closed');
    process.exit(0);
  });
});

process.on('uncaughtException', (error) => {
  winstonLogger.error('Uncaught Exception', {
    error: error.message,
    stack: error.stack,
    context: 'server',
  });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  winstonLogger.error('Unhandled Rejection', {
    reason: reason?.message || reason,
    promise: promise.toString(),
    context: 'server',
  });
});

// Initialize database and start server
function initializeServer() {
  const logger = winstonLogger; // Use the winstonLogger instance
  logger.info('Initializing database...');

  // Determine WebSocket port based on environment
  const backendConfig = config.backend;
  const explicitWsPort = backendConfig.wsPort;

  // WebSocket port logic:
  // 1. Use explicit WS_PORT from config if set
  // 2. For dev server (4000): WebSocket on 4001
  // 3. Otherwise: HTTP_PORT + 1
  const isDevServer =
    process.env.VITE_API_BASE_URL && process.env.VITE_API_BASE_URL.includes('dev.chatluthier.org');
  const wsPort = explicitWsPort !== null ? explicitWsPort : isDevServer ? 4001 : PORT + 1;

  // Set a timeout for database initialization
  const initPromise = Promise.race([
    (async () => {
      await loggedDb.initialize();
      await loggedDb.initializeSchema();
      logger.info('Database ready');
    })(),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Database initialization timeout')), 10000)
    ),
  ]);

  initPromise
    .then(() => {
      server
        .listen(PORT, '0.0.0.0', () => {
          logger.info(`Server started on port ${PORT}`);

          // Initialize WebSocket server on separate port
          try {
            const { initializeWebSocketServer } = require('./sockets/socketServer');
            initializeWebSocketServer(server, PORT, wsPort);
            logger.info(`WebSocket Server started on port ${wsPort}`);
          } catch (error) {
            logger.error(`Failed to start WebSocket server on port ${wsPort}`, {
              error: error.message,
            });
            if (error.code === 'EADDRINUSE') {
              logger.error(
                `WebSocket port ${wsPort} is already in use. Another instance may be running.`
              );
            }
            // Continue running HTTP server even if WebSocket fails
          }
        })
        .on('error', (error) => {
          logger.error(`Failed to bind to port ${PORT}`, { error: error.message });
          if (error.code === 'EADDRINUSE') {
            logger.error(`Port ${PORT} is already in use`);
          }
          process.exit(1);
        });
    })
    .catch((error) => {
      logger.error('Failed to initialize database', { error: error.message });
      logger.warn('Attempting to start server without database initialization...');
      // Try to start server anyway for development
      server
        .listen(PORT, '0.0.0.0', () => {
          logger.info(`Server started on port ${PORT} (database may not be available)`);

          // Initialize WebSocket server on separate port
          try {
            const { initializeWebSocketServer } = require('./sockets/socketServer');
            initializeWebSocketServer(server, PORT, wsPort);
            logger.info(`WebSocket Server started on port ${wsPort}`);
          } catch (error) {
            logger.error(`Failed to start WebSocket server on port ${wsPort}`, {
              error: error.message,
            });
            if (error.code === 'EADDRINUSE') {
              logger.error(
                `WebSocket port ${wsPort} is already in use. Another instance may be running.`
              );
            }
            // Continue running HTTP server even if WebSocket fails
          }
        })
        .on('error', (error) => {
          logger.error(`Failed to bind to port ${PORT} (fallback attempt)`, {
            error: error.message,
          });
          if (error.code === 'EADDRINUSE') {
            logger.error(`Port ${PORT} is already in use`);
          }
          process.exit(1);
        });
    });
}

// Start the server
initializeServer();
