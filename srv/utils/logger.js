const { createLogger, format, transports } = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('node:path');

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
          const logMessage = stack || message;
          const stringifiedMessage =
            typeof logMessage === 'object'
              ? (() => {
                  try {
                    return JSON.stringify(logMessage, null, 2);
                  } catch (e) {
                    logger.error('Failed to stringify log message', e);
                    return '[Object]';
                  }
                })()
              : (() => {
                  try {
                    return JSON.stringify(logMessage);
                  } catch (e) {
                    logger.error('Failed to stringify log message', e);
                    return JSON.stringify({
                      error: 'Failed to stringify log message',
                      value: logMessage,
                    });
                  }
                })();
          return `${timestamp.toISOString()} [${level}]: ${stringifiedMessage}`;
        })
      ),
    }),
    // File transport for production
    new DailyRotateFile({
      filename: path.join(__dirname, '..', 'logs', 'app-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: process.env.MAX_LOG_FILE_SIZE || '10M',
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
const fs = require('node:fs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

module.exports = logger;
