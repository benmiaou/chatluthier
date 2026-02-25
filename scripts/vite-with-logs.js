// Vite client with logging to file
// This wraps the vite dev server and adds file logging

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

// Log file path
const logFilePath = path.join(logsDir, `vite-${new Date().toISOString().slice(0, 10)}.log`);

// Create write stream for logs
const logStream = fs.createWriteStream(logFilePath, { flags: 'a' });

console.log(`📝 Vite logs will be saved to: ${logFilePath}`);
console.log('🔄 Starting Vite dev server with logging...\n');

// Spawn the vite process - use direct path to node_modules
const viteProcess = spawn('node', [path.join(__dirname, '..', 'node_modules', 'vite', 'bin', 'vite.js')], {
    cwd: path.join(__dirname, '..'),
    stdio: ['inherit', 'pipe', 'pipe'] // Capture stdout and stderr
});

// Pipe stdout to both console and log file
viteProcess.stdout.on('data', (data) => {
    const message = data.toString();
    process.stdout.write(message); // Output to console
    logStream.write(`[${new Date().toISOString()}] [VITE] ${message}`); // Write to file
});

// Pipe stderr to both console and log file
viteProcess.stderr.on('data', (data) => {
    const message = data.toString();
    process.stderr.write(message); // Output to console
    logStream.write(`[${new Date().toISOString()}] [VITE-ERR] ${message}`); // Write to file
});

// Handle process exit
viteProcess.on('close', (code) => {
    const exitMessage = `\n🛑 Vite process exited with code ${code}\n`;
    console.log(exitMessage);
    logStream.write(`[${new Date().toISOString()}] ${exitMessage}`);
    logStream.end();
    process.exit(code);
});

// Handle Ctrl+C
process.on('SIGINT', () => {
    const sigintMessage = `\n⏹️  Received SIGINT, shutting down Vite...\n`;
    console.log(sigintMessage);
    logStream.write(`[${new Date().toISOString()}] ${sigintMessage}`);
    viteProcess.kill('SIGINT');
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    const errorMessage = `❌ Uncaught Exception: ${error.message}\n${error.stack}\n`;
    console.error(errorMessage);
    logStream.write(`[${new Date().toISOString()}] [CRASH] ${errorMessage}`);
    viteProcess.kill('SIGTERM');
});