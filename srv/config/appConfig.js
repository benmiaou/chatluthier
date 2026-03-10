const path = require('node:path');
const dotenv = require('dotenv');

// Load environment variables from .env file if it exists
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

function getAppConfig() {
  return {
    // Frontend configuration - these are used by Vite
    frontend: {
      // API base URL - empty for development (uses relative paths)
      apiBaseUrl: process.env.VITE_API_BASE_URL || '',
      // WebSocket host - defaults to window.location.hostname
      wsHost: process.env.VITE_WS_HOST || '',
    },

    // Backend configuration
    backend: {
      // Server port
      port: process.env.PORT || 3000,

      // WebSocket port (null for auto: HTTP_PORT + 1)
      wsPort: process.env.WS_PORT || null,

      // CORS configuration
      allowedOrigins: [
        'http://localhost:5173',
        'http://localhost:3000',
        'https://dev.chatluthier.org:4000',
        'https://chatluthier.org',
      ],

      // Environment
      nodeEnv: process.env.NODE_ENV || 'development',

      // Logging configuration
      logLevel: process.env.LOG_LEVEL || 'info',
      logFile: process.env.LOG_FILE || './logs/app.log',
      maxLogFileSize: process.env.MAX_LOG_FILE_SIZE || '10m',
      maxLogFiles: process.env.MAX_LOG_FILES || 5,
    },

    // Database configuration (if needed)
    database: {
      // Add database config here if needed
    },

    // Security configuration
    security: {
      // Content Security Policy configuration
      // Using kebab-case directive names and array format for helmet compatibility
      contentSecurityPolicy: {
        'default-src': ["'self'"],
        'connect-src': [
          "'self'",
          'ws://localhost:3001',
          'wss://localhost:3001',
          'wss://dev.chatluthier.org/ws/',
        ],
        'script-src': ["'self'", "'unsafe-eval'"],
        'style-src': ["'self'", "'unsafe-inline'"],
        'img-src': ["'self'", 'data:', 'https://mirrors.creativecommons.org'],
        'font-src': ["'self'"],
        'object-src': ["'none'"],
        'base-uri': ["'self'"],
        'form-action': ["'self'"],
        'frame-src': ["'self'"],
        'script-src-attr': ["'none'"],
        'upgrade-insecure-requests': [],
      },

      // CORS configuration - properly configurable, not dangerous "allow all"
      cors: {
        // List of allowed origins - empty array means no CORS (secure by default)
        allowedOrigins: [
          'http://localhost:5173', // Vite dev server
          'http://localhost:3000', // Local backend
          'https://dev.chatluthier.org:4000', // Dev server
          'https://chatluthier.org', // Production
        ],

        // Credentials support
        credentials: true,

        // Additional CORS options
        methods: ['GET', 'PUT', 'POST', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'Content-Length', 'X-Requested-With'],
      },
    },
  };
}

module.exports = getAppConfig();
