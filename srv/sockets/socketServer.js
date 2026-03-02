// In srv/sockets/socketServer.js
const WebSocket = require('ws');

let wsServer = null;
const subscribers = new Map(); // Map of sessionId -> Set of WebSocket connections
const sessionParticipants = new Map(); // Map of sessionId -> Map of clientId -> {pseudo, isAnonymous}
const participantToWs = new Map(); // Map of participantId -> WebSocket connection
const MAX_MESSAGES_PER_SECOND = 10;
const messageTimestamps = new Map();

function initializeWebSocketServer(httpServer, httpPort) {
  const WS_PORT = httpPort + 1;
  
  // Create a separate WebSocket server on port (HTTP port + 1)
  wsServer = new WebSocket.Server({ port: WS_PORT });
  console.log(`WebSocket server initialized on port ${WS_PORT}`);

  wsServer.on('connection', function connection(ws) {
    let connectedId = null;
    let participantId = null;

    ws.on('message', function incoming(message) {
      try {
        const data = JSON.parse(message);
        const clientId = connectedId;
        const now = Date.now();
        const timestamps = messageTimestamps.get(clientId) || [];
        const recentTimestamps = timestamps.filter((timestamp) => now - timestamp < 1000);

        if (recentTimestamps.length >= MAX_MESSAGES_PER_SECOND) {
          ws.send(JSON.stringify({ type: 'error', message: 'Rate limit exceeded.' }));
          console.warn('Rate limit exceeded for client:', clientId);
          return;
        }

        recentTimestamps.push(now);
        messageTimestamps.set(clientId, recentTimestamps);
        switch (data.type) {
          case 'subscribe':
            connectedId = data.id;

            // Generate a unique participant ID for this connection
            participantId = data.participantId || Math.random().toString(36).substring(2, 10);

            if (!subscribers.has(connectedId)) {
              subscribers.set(connectedId, new Set());
              sessionParticipants.set(connectedId, new Map());
            }

            // Check if this participant is already in the session (reconnection)
            const participantsMap = sessionParticipants.get(connectedId);
            const isReconnecting = participantsMap.has(participantId);

            // Update or add participant info
            const participantInfo = {
              pseudo: data.pseudo || null,
              isAnonymous: !data.pseudo,
              id: participantId,
            };
            participantsMap.set(participantId, participantInfo);

            subscribers.get(connectedId).add(ws);

            // Track participant to WebSocket mapping
            participantToWs.set(participantId, ws);

            // Send current participant list to the new client
            const participants = Array.from(participantsMap.values());
            ws.send(
              JSON.stringify({
                type: 'subscribed',
                id: connectedId,
                participantId: participantId, // Send back the participant ID for reconnections
                participants: participants,
              })
            );

            // Only notify other clients if this is not a reconnection
            if (!isReconnecting) {
              const newParticipantMsg = JSON.stringify({
                type: 'participantJoined',
                participant: participantInfo,
              });
              subscribers.get(connectedId).forEach((subscriberWs) => {
                if (subscriberWs !== ws && subscriberWs.readyState === WebSocket.OPEN) {
                  subscriberWs.send(newParticipantMsg);
                }
              });
              console.log(
                `New client joined ID: ${connectedId} with pseudo: ${data.pseudo || 'Anonymous'}`
              );
            } else {
              console.log(
                `Client reconnected to ID: ${connectedId} with pseudo: ${data.pseudo || 'Anonymous'}`
              );
            }
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
                subs.forEach((subscriberWs) => {
                  if (subscriberWs !== ws && subscriberWs.readyState === WebSocket.OPEN) {
                    subscriberWs.send(
                      JSON.stringify({
                        type: data.type,
                        id: connectedId,
                        content: data.content,
                      })
                    );
                  }
                });
              }
            } else {
              ws.send(
                JSON.stringify({ type: 'error', message: 'Client not connected to any ID.' })
              );
            }
            break;

          case 'requestStatus':
            if (connectedId && data.content && data.content.type) {
              const { type: statusType, targetParticipantId } = data.content;

              if (targetParticipantId) {
                // Find the specific participant's WebSocket connection
                const targetWs = participantToWs.get(targetParticipantId);

                if (targetWs && targetWs.readyState === WebSocket.OPEN && targetWs !== ws) {
                  targetWs.send(
                    JSON.stringify({
                      type: 'statusRequest',
                      id: connectedId,
                      content: {
                        statusType,
                        requesterId: participantId,
                      },
                    })
                  );
                }
              }
            }
            break;

          case 'statusResponse':
            if (connectedId && data.content) {
              const { statusType, statusData, responderId } = data.content;
              // Forward the status response to the requester
              const subs = subscribers.get(connectedId);
              if (subs) {
                subs.forEach((subscriberWs) => {
                  if (subscriberWs.readyState === WebSocket.OPEN) {
                    subscriberWs.send(
                      JSON.stringify({
                        type: 'statusResponse',
                        id: connectedId,
                        content: {
                          statusType,
                          statusData,
                          responderId,
                        },
                      })
                    );
                  }
                });
              }
            }
            break;

          case 'unsubscribe':
            if (connectedId && participantId) {
              // Clean up participant to WebSocket mapping
              participantToWs.delete(participantId);

              // Remove the participant from the session
              const participants = sessionParticipants.get(connectedId);
              if (participants && participants.has(participantId)) {
                participants.delete(participantId);

                // Notify other participants that this user left
                const leaveMsg = JSON.stringify({
                  type: 'participantLeft',
                  participantId: participantId,
                });

                const subs = subscribers.get(connectedId);
                if (subs) {
                  subs.forEach((subscriberWs) => {
                    if (subscriberWs.readyState === WebSocket.OPEN) {
                      subscriberWs.send(leaveMsg);
                    }
                  });
                }

                console.log(`Participant ${participantId} properly left session ${connectedId}`);
              }
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
      if (connectedId && participantId) {
        const subs = subscribers.get(connectedId);
        if (subs) {
          subs.delete(ws);

          // Clean up participant to WebSocket mapping
          participantToWs.delete(participantId);

          // Remove the specific participant
          const participants = sessionParticipants.get(connectedId);
          if (participants) {
            participants.delete(participantId);

            // Notify other clients about the participant leaving
            const leaveMsg = JSON.stringify({
              type: 'participantLeft',
              participantId: participantId,
            });

            subs.forEach((subscriberWs) => {
              if (subscriberWs !== ws && subscriberWs.readyState === WebSocket.OPEN) {
                subscriberWs.send(leaveMsg);
              }
            });

            console.log(`Participant ${participantId} left session ${connectedId}`);
          }

          if (subs.size === 0) {
            subscribers.delete(connectedId);
            sessionParticipants.delete(connectedId);
            console.log(`No more subscribers for ID: ${connectedId}, ID removed.`);
          }
        }
      }
    });
  });

  return wsServer;
}

module.exports = { initializeWebSocketServer, wsServer: () => wsServer };
