// In srv/sockets/socketServer.js
const WebSocket = require('ws');

const wsServer = new WebSocket.Server({ port: 3001 });

const subscribers = new Map();
const MAX_MESSAGES_PER_SECOND = 10;
const messageTimestamps = new Map();

wsServer.on('connection', function connection(ws) {
    let connectedId = null;

    ws.on('message', function incoming(message) {
        try {
            const data = JSON.parse(message);
            const clientId = connectedId;
            const now = Date.now();
            const timestamps = messageTimestamps.get(clientId) || [];
            const recentTimestamps = timestamps.filter(timestamp => now - timestamp < 1000);

            if (recentTimestamps.length >= MAX_MESSAGES_PER_SECOND) {
                ws.send(JSON.stringify({ type: 'error', message: 'Rate limit exceeded.' }));
                console.warn('Rate limit exceeded for client:', clientId);
                return;
            }

            recentTimestamps.push(now);
            messageTimestamps.set(clientId, recentTimestamps);
            console.log('Received:', data.type);

            switch (data.type) {
                case 'subscribe':
                    connectedId = data.id;
                    if (!subscribers.has(connectedId)) {
                        subscribers.set(connectedId, new Set());
                    }
                    subscribers.get(connectedId).add(ws);
                    ws.send(JSON.stringify({ type: 'subscribed', id: connectedId }));
                    console.log(`Client subscribed to ID: ${connectedId}`);
                    break;

                case 'message':
                case 'ambianceStatusUpdate':
                case 'backgroundMusicChange':
                case 'backgroundMusicVolumeChange':
                case 'backgroundMusicStop':
                case 'playSoundboardSound':
                    if (connectedId) {
                        const subs = subscribers.get(connectedId);
                        if (subs) {
                            subs.forEach(subscriberWs => {
                                if (subscriberWs !== ws && subscriberWs.readyState === WebSocket.OPEN) {
                                    subscriberWs.send(JSON.stringify({
                                        type: data.type,
                                        id: connectedId,
                                        content: data.content,
                                    }));
                                }
                            });
                        }
                    } else {
                        ws.send(JSON.stringify({ type: 'error', message: 'Client not connected to any ID.' }));
                        console.warn('Client not connected to any ID.');
                    }
                    break;

                case 'ping':
                    break;

                default:
                    console.warn('Unknown message type:', data.type);
            }
        } catch (error) {
            console.error('Error processing message:', error);
        }
    });

    ws.on('close', function () {
        console.log('Connection closed');
        if (connectedId) {
            const subs = subscribers.get(connectedId);
            if (subs) {
                subs.delete(ws);
                if (subs.size === 0) {
                    subscribers.delete(connectedId);
                    console.log(`No more subscribers for ID: ${connectedId}, ID removed.`);
                }
            }
        }
    });
});

module.exports = { wsServer };
