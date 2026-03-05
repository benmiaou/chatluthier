// In srv/sockets/socketServer.js
const WebSocket = require('ws');

let wsServer = null;
const subscribers = new Map(); // Map of sessionId -> Set of WebSocket connections
const sessionParticipants = new Map(); // Map of sessionId -> Map of clientId -> {pseudo, isAnonymous}
const participantToWs = new Map(); // Map of participantId -> WebSocket connection
const MAX_MESSAGES_PER_SECOND = 10;
const messageTimestamps = new Map();

function isRateLimited(clientId) {
  const now = Date.now();
  const timestamps = messageTimestamps.get(clientId) || [];
  const recentTimestamps = timestamps.filter((timestamp) => now - timestamp < 1000);

  if (recentTimestamps.length >= MAX_MESSAGES_PER_SECOND) {
    return true;
  }

  recentTimestamps.push(now);
  messageTimestamps.set(clientId, recentTimestamps);
  return false;
}

function initializeWebSocketServer(httpServer, httpPort) {
  const WS_PORT = httpPort + 1;

  // Create a separate WebSocket server on port (HTTP port + 1)
  wsServer = new WebSocket.Server({ server: httpServer });
  console.log(`WebSocket server initialized on port ${httpPort}`);

  function handleSubscribe(data, ws) {
    const connectedId = data.id;
    const participantId = data.participantId || Math.random().toString(36).substring(2, 10);

    if (!subscribers.has(connectedId)) {
      subscribers.set(connectedId, new Set());
      sessionParticipants.set(connectedId, new Map());
    }

    const participantsMap = sessionParticipants.get(connectedId);
    const isReconnecting = participantsMap.has(participantId);

    const participantInfo = {
      pseudo: data.pseudo || null,
      isAnonymous: !data.pseudo,
      id: participantId,
    };
    participantsMap.set(participantId, participantInfo);
    subscribers.get(connectedId).add(ws);
    participantToWs.set(participantId, ws);

    const participants = Array.from(participantsMap.values());
    ws.send(
      JSON.stringify({
        type: 'subscribed',
        id: connectedId,
        participantId: participantId,
        participants: participants,
      })
    );

    if (isReconnecting) {
      console.log(
        `Client reconnected to ID: ${connectedId} with pseudo: ${data.pseudo || 'Anonymous'}`
      );
    } else {
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
    }
  }

  function handleBroadcast(data, ws, connectedId) {
    if (!connectedId) {
      ws.send(JSON.stringify({ type: 'error', message: 'Client not connected to any ID.' }));
      return;
    }

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
  }

  function handleRequestStatus(data, ws, connectedId, participantId) {
    if (!connectedId || !data.content?.type) return;

    const { type: statusType, targetParticipantId } = data.content;
    if (!targetParticipantId) return;

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

  function handleStatusResponse(data, ws, connectedId) {
    if (!connectedId || !data.content) return;

    const { statusType, statusData, responderId } = data.content;
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

  function handleUnsubscribe(connectedId, participantId) {
    if (!connectedId || !participantId) return;

    participantToWs.delete(participantId);

    const participants = sessionParticipants.get(connectedId);
    if (!participants?.has(participantId)) return;

    participants.delete(participantId);

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

  wsServer.on('connection', function connection(ws) {
    let connectedId = null;
    let participantId = null;

    ws.on('message', function incoming(message) {
      try {
        const data = JSON.parse(message);
        const clientId = connectedId;

        if (isRateLimited(clientId)) {
          ws.send(JSON.stringify({ type: 'error', message: 'Rate limit exceeded.' }));
          console.warn('Rate limit exceeded for client:', clientId);
          return;
        }

        switch (data.type) {
          case 'subscribe':
            handleSubscribe(data, ws);
            connectedId = data.id;
            participantId = data.participantId || Math.random().toString(36).substring(2, 10);
            break;

          case 'message':
          case 'ambianceStatusUpdate':
          case 'backgroundMusicChange':
          case 'backgroundMusicVolumeChange':
          case 'backgroundMusicStop':
          case 'playSoundboardSound':
            handleBroadcast(data, ws, connectedId);
            break;

          case 'requestStatus':
            handleRequestStatus(data, ws, connectedId, participantId);
            break;

          case 'statusResponse':
            handleStatusResponse(data, ws, connectedId);
            break;

          case 'unsubscribe':
            handleUnsubscribe(connectedId, participantId);
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
