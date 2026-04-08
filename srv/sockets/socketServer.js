// In srv/sockets/socketServer.js
const WebSocket = require('ws');
const logger = require('../utils/logger');

let wsServer = null;
const subscribers = new Map(); // Map of sessionId -> Set of WebSocket connections
const sessionParticipants = new Map(); // Map of sessionId -> Map of clientId -> {pseudo, isAnonymous}
const participantToWs = new Map(); // Map of participantId -> WebSocket connection
const sessionLeaders = new Map(); // Map of sessionId -> leaderParticipantId
const sessionPlaylists = new Map(); // Map of sessionId -> playlist array
const sessionCurrentTrackIndex = new Map(); // Map of sessionId -> current track index
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

function initializeWebSocketServer(httpServer, httpPort, wsPort = null) {
  // Determine the WebSocket port
  const websocketPort = wsPort !== null ? wsPort : httpPort + 1;

  // Always create a standalone WebSocket server on the specified port
  try {
    wsServer = new WebSocket.Server({ port: websocketPort });
    console.log(`WebSocket server initialized on port ${websocketPort}`);
  } catch (error) {
    console.error(`Failed to start WebSocket server on port ${websocketPort}:`, error.message);
    throw error;
  }

  function handleSubscribe(data, ws) {
    const connectedId = data.id;
    const participantId = data.participantId || Math.random().toString(36).substring(2, 10);
    // Return the assigned participantId so the caller can sync the closure variable

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
    return participantId;
  }

  function handleBroadcast(data, ws, connectedId) {
    if (!connectedId) {
      ws.send(JSON.stringify({ type: 'error', message: 'Client not connected to any ID.' }));
      return;
    }

    const subs = subscribers.get(connectedId);
    if (!subs) return;

    // Get the participant ID for the sender
    const participantId = Array.from(participantToWs.entries()).find(
      ([_, wsEntry]) => wsEntry === ws
    )?.[0];

    // Check if this is a background music related message
    if (
      data.type === 'backgroundMusicChange' ||
      data.type === 'backgroundMusicStop' ||
      data.type === 'backgroundMusicVolumeChange'
    ) {
      // Only leaders can broadcast background music changes
      const currentLeader = sessionLeaders.get(connectedId);

      if (participantId !== currentLeader) {
        ws.send(
          JSON.stringify({
            type: 'error',
            message: 'Only the leader can broadcast background music changes.',
          })
        );
        return;
      }
    }

    // Log background music changes for debugging
    if (data.type === 'backgroundMusicChange' || data.type === 'backgroundMusicStop') {
      logger.info(`Broadcasting ${data.type} from participant ${participantId || 'unknown'}`, {
        sessionId: connectedId,
        participantCount: subs.size,
        contentType: data.content?.filename
          ? 'local'
          : data.content?.externalSound
            ? 'external'
            : 'unknown',
      });
    }

    // Handle playlist management for background music changes
    if (data.type === 'backgroundMusicChange' && data.content) {
      // Initialize playlist if it doesn't exist
      if (!sessionPlaylists.has(connectedId)) {
        sessionPlaylists.set(connectedId, []);
      }

      const playlist = sessionPlaylists.get(connectedId);

      // Add the track to playlist if it's not already there
      const trackKey =
        data.content.filename ||
        (data.content.externalSound
          ? `${data.content.externalSound.provider}:${data.content.externalSound.trackId}`
          : null);

      if (trackKey && !playlist.includes(trackKey)) {
        playlist.push(trackKey);
      }

      // Update current track index
      if (trackKey) {
        const currentIndex = playlist.indexOf(trackKey);
        if (currentIndex !== -1) {
          sessionCurrentTrackIndex.set(connectedId, currentIndex);
        }
      }
    }

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

  function handleSetLeader(data, ws, connectedId) {
    if (!connectedId) {
      ws.send(JSON.stringify({ type: 'error', message: 'Client not connected to any ID.' }));
      return;
    }

    // Get the participant ID for the requester
    const participantId = Array.from(participantToWs.entries()).find(
      ([_, wsEntry]) => wsEntry === ws
    )?.[0];

    if (!participantId) {
      ws.send(JSON.stringify({ type: 'error', message: 'Participant not found.' }));
      return;
    }

    // Set this participant as the leader for the session
    sessionLeaders.set(connectedId, participantId);

    // Notify all participants about the new leader
    const subs = subscribers.get(connectedId);
    if (subs) {
      subs.forEach((subscriberWs) => {
        if (subscriberWs.readyState === WebSocket.OPEN) {
          subscriberWs.send(
            JSON.stringify({
              type: 'leaderChange',
              id: connectedId,
              content: {
                leaderId: participantId,
              },
            })
          );
        }
      });
    }

    ws.send(
      JSON.stringify({
        type: 'leaderStatus',
        id: connectedId,
        content: {
          isLeader: true,
        },
      })
    );
  }

  function handleGetLeaderStatus(data, ws, connectedId) {
    if (!connectedId) {
      ws.send(JSON.stringify({ type: 'error', message: 'Client not connected to any ID.' }));
      return;
    }

    // Get the participant ID for the requester
    const participantId = Array.from(participantToWs.entries()).find(
      ([_, wsEntry]) => wsEntry === ws
    )?.[0];

    if (!participantId) {
      ws.send(JSON.stringify({ type: 'error', message: 'Participant not found.' }));
      return;
    }

    const currentLeader = sessionLeaders.get(connectedId);
    const isLeader = participantId === currentLeader;

    ws.send(
      JSON.stringify({
        type: 'leaderStatus',
        id: connectedId,
        content: {
          isLeader: isLeader,
          leaderId: currentLeader,
        },
      })
    );
  }

  function handleSetPlaylist(data, ws, connectedId) {
    if (!connectedId) {
      ws.send(JSON.stringify({ type: 'error', message: 'Client not connected to any ID.' }));
      return;
    }

    // Get the participant ID for the requester
    const participantId = Array.from(participantToWs.entries()).find(
      ([_, wsEntry]) => wsEntry === ws
    )?.[0];

    // Check if this participant is the leader
    const currentLeader = sessionLeaders.get(connectedId);

    if (participantId !== currentLeader) {
      ws.send(
        JSON.stringify({
          type: 'error',
          message: 'Only the leader can set the playlist.',
        })
      );
      return;
    }

    // Validate and set the playlist
    if (data.content?.playlist && Array.isArray(data.content.playlist)) {
      sessionPlaylists.set(connectedId, data.content.playlist);

      if (typeof data.content.currentTrackIndex === 'number') {
        sessionCurrentTrackIndex.set(connectedId, data.content.currentTrackIndex);
      } else {
        sessionCurrentTrackIndex.set(connectedId, 0);
      }

      console.log(`Playlist set for session ${connectedId}:`, data.content.playlist);

      ws.send(
        JSON.stringify({
          type: 'playlistStatus',
          id: connectedId,
          content: {
            playlist: data.content.playlist,
            currentTrackIndex: sessionCurrentTrackIndex.get(connectedId) || 0,
          },
        })
      );
    } else {
      ws.send(
        JSON.stringify({
          type: 'error',
          message: 'Invalid playlist data.',
        })
      );
    }
  }

  function handleGetPlaylist(data, ws, connectedId) {
    if (!connectedId) {
      ws.send(JSON.stringify({ type: 'error', message: 'Client not connected to any ID.' }));
      return;
    }

    const playlist = sessionPlaylists.get(connectedId) || [];
    const currentIndex = sessionCurrentTrackIndex.get(connectedId) || 0;

    ws.send(
      JSON.stringify({
        type: 'playlistStatus',
        id: connectedId,
        content: {
          playlist: playlist,
          currentTrackIndex: currentIndex,
        },
      })
    );
  }

  function handleTrackEnded(data, ws, connectedId) {
    console.log(`[Server] TrackEnded received for session: ${connectedId}`);

    if (!connectedId) {
      console.warn(`[Server] TrackEnded: No connectedId`);
      ws.send(JSON.stringify({ type: 'error', message: 'Client not connected to any ID.' }));
      return;
    }

    // Get the participant ID for the requester
    const participantId = Array.from(participantToWs.entries()).find(
      ([_, wsEntry]) => wsEntry === ws
    )?.[0];

    console.log(`[Server] TrackEnded: Participant ${participantId} in session ${connectedId}`);

    // Check if this participant is the leader
    const currentLeader = sessionLeaders.get(connectedId);

    console.log(
      `[Server] TrackEnded: Current leader for session ${connectedId} is ${currentLeader}, participant is ${participantId}`
    );

    if (participantId !== currentLeader) {
      // Not the leader, just ignore or send error
      console.warn(
        `[Server] TrackEnded: Participant ${participantId} is not leader ${currentLeader}`
      );
      ws.send(
        JSON.stringify({
          type: 'error',
          message: 'Only the leader can handle track ended events.',
        })
      );
      return;
    }

    // Get current playlist and index
    const playlist = sessionPlaylists.get(connectedId) || [];
    let currentIndex = sessionCurrentTrackIndex.get(connectedId) || 0;

    console.log(`[Server] TrackEnded: Current playlist for session ${connectedId}:`, playlist);
    console.log(`[Server] TrackEnded: Current index BEFORE increment: ${currentIndex}`);

    if (playlist.length === 0) {
      // No playlist, nothing to do
      console.warn(`[Server] TrackEnded: No playlist for session ${connectedId}`);
      return;
    }

    // Move to next track (or loop to beginning)
    const previousIndex = currentIndex;
    currentIndex = (currentIndex + 1) % playlist.length;
    sessionCurrentTrackIndex.set(connectedId, currentIndex);

    const nextTrackKey = playlist[currentIndex];

    console.log(
      `[Track Ended] Session ${connectedId}: Advancing from track ${previousIndex} to ${currentIndex}, next track: ${nextTrackKey}`
    );
    console.log(
      `[Track Ended] Session ${connectedId}: Playlist length: ${playlist.length}, current index after update: ${currentIndex}`
    );

    // Broadcast the next track to all participants
    // Note: We only have the track key here, not the full track data.
    // The clients will need to look up the track details locally.
    const subs = subscribers.get(connectedId);
    if (subs) {
      subs.forEach((subscriberWs) => {
        if (subscriberWs.readyState === WebSocket.OPEN) {
          subscriberWs.send(
            JSON.stringify({
              type: 'backgroundMusicChange',
              id: connectedId,
              content: {
                trackKey: nextTrackKey,
                isAutoPlay: true,
              },
            })
          );
        }
      });
    } else {
      console.warn(
        `[Track Ended] Session ${connectedId}: No subscribers to notify about next track`
      );
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
            connectedId = data.id;
            participantId = handleSubscribe(data, ws);
            break;

          case 'message':
          case 'ambianceStatusUpdate':
          case 'backgroundMusicChange':
          case 'backgroundMusicVolumeChange':
          case 'backgroundMusicStop':
          case 'playSoundboardSound':
            handleBroadcast(data, ws, connectedId);
            break;

          case 'setLeader':
            handleSetLeader(data, ws, connectedId);
            break;

          case 'getLeaderStatus':
            handleGetLeaderStatus(data, ws, connectedId);
            break;

          case 'setPlaylist':
            handleSetPlaylist(data, ws, connectedId);
            break;

          case 'getPlaylist':
            handleGetPlaylist(data, ws, connectedId);
            break;

          case 'trackEnded':
            handleTrackEnded(data, ws, connectedId);
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
            sessionLeaders.delete(connectedId);
            sessionPlaylists.delete(connectedId);
            sessionCurrentTrackIndex.delete(connectedId);
            console.log(`No more subscribers for ID: ${connectedId}, ID removed.`);
          }
        }
      }
    });
  });

  return wsServer;
}

function _resetStateForTests() {
  subscribers.clear();
  sessionParticipants.clear();
  participantToWs.clear();
  sessionLeaders.clear();
  sessionPlaylists.clear();
  sessionCurrentTrackIndex.clear();
  messageTimestamps.clear();
}

module.exports = { initializeWebSocketServer, wsServer: () => wsServer, _resetStateForTests };
