const app = require('./app');
const http = require('node:http');
const server = http.createServer(app);
const db = require('./database/db');
const logger = require('./utils/logger');

const PORT = 3000;

// Wrap database methods to log SQL queries
const loggedDb = logger.wrapDatabaseMethods(db);

// Handle process termination gracefully
process.on('SIGINT', () => {
  logger.info('Received SIGINT, shutting down gracefully...');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  logger.info('Received SIGTERM, shutting down gracefully...');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

process.on('uncaughtException', (error) => {
  logger.fatal('Uncaught Exception', { error: error.message, stack: error.stack }, 1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', { reason: reason?.message || reason, promise });
});

// Use top-level await for server initialization
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

try {
  await initPromise;

  server.listen(PORT, '0.0.0.0', () => {
    logger.info(`Server started on port ${PORT}`);

    // Initialize WebSocket server on port 3001 (HTTP port + 1)
    const { initializeWebSocketServer } = require('./sockets/socketServer');
    initializeWebSocketServer(server, PORT);
    logger.info(`WebSocket Server started on port ${PORT + 1}`);
  });
} catch (error) {
  logger.error('Failed to initialize database', { error: error.message });
  logger.warn('Attempting to start server without database initialization...');
  // Try to start server anyway for development
  server.listen(PORT, '0.0.0.0', () => {
    logger.info(`Server started on port ${PORT} (database may not be available)`);

    // Initialize WebSocket server on port 3001 (HTTP port + 1)
    const { initializeWebSocketServer } = require('./sockets/socketServer');
    initializeWebSocketServer(server, PORT);
    logger.info(`WebSocket Server started on port ${PORT + 1}`);
  });
}
