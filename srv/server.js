const app = require('./app');
const http = require('http');
const server = http.createServer(app);
const db = require('./database/db');

const PORT = 3000;

// Initialize database before starting server
async function startServer() {
    try {
        console.log('Initializing database...');
        
        // Set a timeout for database initialization
        const initPromise = Promise.race([
            (async () => {
                await db.initialize();
                await db.initializeSchema();
                console.log('Database ready');
            })(),
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Database initialization timeout')), 10000)
            )
        ]);

        await initPromise;
        
        server.listen(PORT, '0.0.0.0', () => {
            console.log(`Server started on port ${PORT}`);
            
            // Initialize WebSocket server after HTTP server is running
            const { wsServer } = require('./sockets/socketServer');
            console.log(`WebSocket Server started on port ${wsServer.address().port}`);
        });
        
    } catch (error) {
        console.error('Failed to initialize database:', error);
        console.log('Attempting to start server without database initialization...');
        // Try to start server anyway for development
        server.listen(PORT, '0.0.0.0', () => {
            console.log(`Server started on port ${PORT} (database may not be available)`);
            
            // Initialize WebSocket server after HTTP server is running
            const { wsServer } = require('./sockets/socketServer');
            console.log(`WebSocket Server started on port ${wsServer.address().port}`);
        });
    }
}

startServer();