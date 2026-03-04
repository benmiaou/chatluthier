const { createLogger, format, transports } = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');

/**
 * Configure Winston logger for backend services
 */
const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: format.combine(
    format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss',
    }),
    format.errors({ stack: true }),
    format.splat(),
    format.json()
  ),
  defaultMeta: { service: 'chatluthier-backend' },
  transports: [
    // Console transport for development
    new transports.Console({
      format: format.combine(
        format.colorize(),
        format.printf(({ level, message, timestamp, stack }) => {
          return `${timestamp} [${level}]: ${stack || message}`;
        })
      ),
    }),
    // File transport for production
    new DailyRotateFile({
      filename: path.join(__dirname, '..', 'logs', 'app-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: process.env.MAX_LOG_FILE_SIZE || '10m',
      maxFiles: process.env.MAX_LOG_FILES || '5',
      level: 'info',
    }),
    // Error-specific file transport
    new DailyRotateFile({
      filename: path.join(__dirname, '..', 'logs', 'error-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: process.env.MAX_LOG_FILE_SIZE || '10m',
      maxFiles: process.env.MAX_LOG_FILES || '5',
      level: 'error',
    }),
  ],
  exceptionHandlers: [
    new DailyRotateFile({
      filename: path.join(__dirname, '..', 'logs', 'exceptions-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: process.env.MAX_LOG_FILE_SIZE || '10m',
      maxFiles: process.env.MAX_LOG_FILES || '5',
    }),
  ],
  rejectionHandlers: [
    new DailyRotateFile({
      filename: path.join(__dirname, '..', 'logs', 'rejections-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: process.env.MAX_LOG_FILE_SIZE || '10m',
      maxFiles: process.env.MAX_LOG_FILES || '5',
    }),
  ],
  exitOnError: false,
});

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '..', 'logs');
const fs = require('fs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

module.exports = logger;
