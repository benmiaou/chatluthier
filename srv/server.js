const app = require('./app');
const http = require('http');
const server = http.createServer(app);
const { wsServer } = require('./sockets/socketServer');

const PORT = 3000;
server.listen(PORT, '0.0.0.0', () => console.log(`Server started on port ${PORT}`));
wsServer.on('listening', () => {
    console.log(`WebSocket Server started on port ${wsServer.address().port}`);
});