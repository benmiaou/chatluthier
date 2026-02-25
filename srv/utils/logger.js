const fs = require('fs');
const path = require('path');
const { format } = require('util');

/**
 * Logger Utility for ChatLuthier
 * 
 * Features:
 * - Log rotation (7 days)
 * - Different log levels (INFO, WARN, ERROR, SQL, ACCESS)
 * - Timestamps and formatting
 * - Automatic cleanup of old logs
 */

class Logger {
    constructor() {
        this.logsDir = path.join(__dirname, '..', '..', 'logs');
        this.ensureLogsDirectory();
        this.cleanupOldLogs();
    }

    /**
     * Ensure logs directory exists
     */
    ensureLogsDirectory() {
        if (!fs.existsSync(this.logsDir)) {
            fs.mkdirSync(this.logsDir, { recursive: true });
        }
    }

    /**
     * Clean up logs older than 7 days
     */
    cleanupOldLogs() {
        try {
            const files = fs.readdirSync(this.logsDir);
            const now = new Date();
            const sevenDaysAgo = now.getTime() - (7 * 24 * 60 * 60 * 1000);

            files.forEach(file => {
                if (file.endsWith('.log')) {
                    const filePath = path.join(this.logsDir, file);
                    const stats = fs.statSync(filePath);
                    
                    if (stats.mtime.getTime() < sevenDaysAgo) {
                        fs.unlinkSync(filePath);
                        console.log(`🗑️  Deleted old log file: ${file}`);
                    }
                }
            });
        } catch (error) {
            console.error('Error cleaning up old logs:', error.message);
        }
    }

    /**
     * Get log file path for today
     */
    getLogFilePath() {
        const today = new Date().toISOString().slice(0, 10);
        return path.join(this.logsDir, `server-${today}.log`);
    }

    /**
     * Format log message
     */
    formatMessage(level, message, context = {}) {
        const timestamp = new Date().toISOString();
        let formattedMessage = `[${timestamp}] [${level}] ${message}`;
        
        if (Object.keys(context).length > 0) {
            formattedMessage += ` ${JSON.stringify(context)}`;
        }
        
        return formattedMessage + '\n';
    }

    /**
     * Write log to file
     */
    writeToFile(message) {
        const logFilePath = this.getLogFilePath();
        fs.appendFileSync(logFilePath, message, 'utf8');
    }

    /**
     * Log info message
     */
    info(message, context = {}) {
        const formatted = this.formatMessage('INFO', message, context);
        console.log(formatted.trim());
        this.writeToFile(formatted);
    }

    /**
     * Log warning message
     */
    warn(message, context = {}) {
        const formatted = this.formatMessage('WARN', message, context);
        console.warn(formatted.trim());
        this.writeToFile(formatted);
    }

    /**
     * Log error message
     */
    error(message, context = {}) {
        const formatted = this.formatMessage('ERROR', message, context);
        console.error(formatted.trim());
        this.writeToFile(formatted);
    }

    /**
     * Log SQL query
     */
    sql(query, params = []) {
        const formatted = this.formatMessage('SQL', query, { params });
        console.log(formatted.trim());
        this.writeToFile(formatted);
    }

    /**
     * Log user access/connection
     */
    access(userId, action, details = {}) {
        const context = { userId, action, ...details };
        const formatted = this.formatMessage('ACCESS', `User ${action}`, context);
        console.log(formatted.trim());
        this.writeToFile(formatted);
    }

    /**
     * Log critical error and exit
     */
    fatal(message, context = {}, exitCode = 1) {
        const formatted = this.formatMessage('FATAL', message, context);
        console.error(formatted.trim());
        this.writeToFile(formatted);
        process.exit(exitCode);
    }

    /**
     * Create a middleware for Express to log requests
     */
    expressMiddleware() {
        return (req, res, next) => {
            const start = Date.now();
            
            res.on('finish', () => {
                const duration = Date.now() - start;
                const userId = req.user?.id || 'anonymous';
                
                this.access(userId, 'HTTP_REQUEST', {
                    method: req.method,
                    path: req.path,
                    status: res.statusCode,
                    duration: `${duration}ms`,
                    ip: req.ip || req.connection?.remoteAddress
                });
            });
            
            next();
        };
    }

    /**
     * Wrap database methods to log SQL queries
     */
    wrapDatabaseMethods(db) {
        const originalQuery = db.query.bind(db);
        const originalExecute = db.execute.bind(db);
        
        db.query = async (sql, params = []) => {
            this.sql(sql, params);
            return originalQuery(sql, params);
        };
        
        db.execute = async (sql, params = []) => {
            this.sql(sql, params);
            return originalExecute(sql, params);
        };
        
        return db;
    }
}

// Singleton instance
const logger = new Logger();

module.exports = logger;