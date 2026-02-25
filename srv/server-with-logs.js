// Server with logging to file
// This wraps the original server and adds file logging

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// Create logs directory if it doesn't exist (in root, not srv)
const logsDir = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

// Log file path - use combined log file
const logFilePath = path.join(logsDir, `combined-${new Date().toISOString().slice(0, 10)}.log`);

// Create write stream for logs
const logStream = fs.createWriteStream(logFilePath, { flags: 'a' });

console.log(`📝 Server logs will be saved to: ${logFilePath}`);
console.log('🔄 Starting server with logging...\n');

// Spawn the original server process
const serverProcess = spawn('node', ['srv/server.js'], {
    cwd: path.join(__dirname, '..'),
    stdio: ['inherit', 'pipe', 'pipe'] // Capture stdout and stderr
});

// Pipe stdout to both console and log file
serverProcess.stdout.on('data', (data) => {
    const message = data.toString();
    console.log(message.trim()); // Output to console
    logStream.write(`[${new Date().toISOString()}] [SERVER] ${message}`); // Write to file
});

// Pipe stderr to both console and log file
serverProcess.stderr.on('data', (data) => {
    const message = data.toString();
    console.error(message.trim()); // Output to console
    logStream.write(`[${new Date().toISOString()}] [SERVER-ERR] ${message}`); // Write to file
});

// Handle process exit
serverProcess.on('close', (code) => {
    const exitMessage = `\n🛑 Server process exited with code ${code}\n`;
    console.log(exitMessage);
    logStream.write(`[${new Date().toISOString()}] ${exitMessage}`);
    logStream.end();
    process.exit(code);
});

// Handle Ctrl+C
process.on('SIGINT', () => {
    const sigintMessage = `\n⏹️  Received SIGINT, shutting down server...\n`;
    console.log(sigintMessage);
    logStream.write(`[${new Date().toISOString()}] ${sigintMessage}`);
    serverProcess.kill('SIGINT');
});

// Handle SIGTERM (for when concurrently shuts down)
process.on('SIGTERM', () => {
    const sigtermMessage = `\n🔴 Received SIGTERM, shutting down server...\n`;
    console.log(sigtermMessage);
    logStream.write(`[${new Date().toISOString()}] ${sigtermMessage}`);
    serverProcess.kill('SIGTERM');
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    const errorMessage = `❌ Uncaught Exception: ${error.message}\n${error.stack}\n`;
    console.error(errorMessage);
    logStream.write(`[${new Date().toISOString()}] [CRASH] ${errorMessage}`);
    serverProcess.kill('SIGTERM');
});