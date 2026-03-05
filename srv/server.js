const app = require('./app');
const http = require('node:http');
const server = http.createServer(app);
const db = require('./database/db');
const winstonLogger = require('./utils/logger');

let PORT = process.argv[2] ? Number.parseInt(process.argv[2]) : 3000;
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
  logger.info('Received SIGINT, shutting down gracefully...');
  server.close(() => {
    logger.info('Server closed');
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

          // Initialize WebSocket server (attached to HTTP server)
          const { initializeWebSocketServer } = require('./sockets/socketServer');
          initializeWebSocketServer(server, PORT);
          logger.info(`WebSocket Server started on port ${PORT}`);
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

          // Initialize WebSocket server on port 3001 (HTTP port + 1)
          const { initializeWebSocketServer } = require('./sockets/socketServer');
          initializeWebSocketServer(server, PORT);
          logger.info(`WebSocket Server started on port ${PORT + 1}`);
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
