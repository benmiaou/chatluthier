import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import React from 'react';

export type WsMessageType =
  | 'backgroundMusicChange'
  | 'backgroundMusicStop'
  | 'playSoundboardSound'
  | 'ambianceStatusUpdate'
  | 'message'
  | 'subscribed'
  | 'participantJoined'
  | 'participantLeft'
  | 'requestStatus'
  | 'statusRequest'
  | 'statusResponse'
  | 'unsubscribe'
  | 'error';

export interface WsMessage {
  type: WsMessageType;
  id?: string;
  content?: unknown;
  message?: string;
  participants?: Array<{ pseudo: string | null; isAnonymous: boolean; id: string }>;
  participant?: { pseudo: string | null; isAnonymous: boolean; id: string };
}

type MessageHandler = (msg: WsMessage) => void;

interface SocketContextValue {
  connected: boolean;
  sessionId: string | null;
  statusMessage: string;
  participants: Array<{ pseudo: string | null; isAnonymous: boolean; id: string }>;
  subscribe: (id: string) => void;
  disconnect: () => void;
  send: (msg: Record<string, unknown>) => void;
  addMessageHandler: (handler: MessageHandler) => () => void;
}

const SocketContext = createContext<SocketContextValue | null>(null);

const isLocalhost =
  globalThis.location.hostname === 'localhost' || globalThis.location.hostname === '127.0.0.1';
const protocol = globalThis.location.protocol === 'https:' ? 'wss:' : 'ws:';
const WS_URL = isLocalhost ? 'ws://localhost:3000' : `${protocol}//${globalThis.location.host}/ws/`;

const RECONNECT_MS = 5000;
const HEARTBEAT_MS = 30_000;

export function SocketProvider({ children }: Readonly<{ children: ReactNode }>): React.ReactElement {
  const wsRef = useRef<WebSocket | null>(null);
  const handlersRef = useRef<Set<MessageHandler>>(new Set());
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shouldReconnectRef = useRef(true);
  // ID to subscribe to on next open (set by subscribe() when WS isn't ready yet)
  const pendingIdRef = useRef<string | null>(null);

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Initializing session manager...');
  const [participants, setParticipants] = useState<
    Array<{ pseudo: string | null; isAnonymous: boolean; id: string }>
  >([]);
  const [participantId, setParticipantId] = useState<string | null>(null);

  const clearHeartbeat = () => {
    if (heartbeatRef.current) {clearInterval(heartbeatRef.current);}
    heartbeatRef.current = null;
  };

  const connect = useCallback((): void => {
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    // Set a timeout for connection
    const connectionTimeout = setTimeout(() => {
      if (ws.readyState !== WebSocket.OPEN) {
        setStatusMessage('Connection timeout. Retrying...');
        ws.close();
      }
    }, 3000);

    ws.onopen = () => {
      clearTimeout(connectionTimeout);

      setConnected(true);
      setStatusMessage('Connected to session server. Ready to join or create a session.');
      clearHeartbeat();
      heartbeatRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {ws.send(JSON.stringify({ type: 'ping' }));}
      }, HEARTBEAT_MS);

      // Priority: pending subscribe call > URL param > localStorage
      const urlParams = new URLSearchParams(globalThis.location.search);
      const urlId = urlParams.get('sessionId');
      const idToJoin = pendingIdRef.current ?? urlId ?? localStorage.getItem('lastJoinId');

      if (idToJoin) {
        // Get pseudo and participant ID
        const userPseudo = localStorage.getItem('userPseudo') || null;
        const storedParticipantId =
          localStorage.getItem('pendingParticipantId') ||
          localStorage.getItem('wsParticipantId') ||
          null;

        ws.send(
          JSON.stringify({
            type: 'subscribe',
            id: idToJoin,
            pseudo: userPseudo,
            participantId: storedParticipantId,
          })
        );

        // Clean up pending IDs
        pendingIdRef.current = null;
        localStorage.removeItem('pendingParticipantId');

        if (urlId) {
          urlParams.delete('sessionId');
          globalThis.history.replaceState(
            {},
            '',
            globalThis.location.pathname + (urlParams.toString() ? `?${urlParams}` : '')
          );
        }
      }
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data as string) as WsMessage;

        switch (data.type) {
        case 'subscribed':
          setSessionId(data.id ?? null);
          setStatusMessage(`Joined session: ${data.id ?? ''}`);
          if (data.participantId) {
            setParticipantId(data.participantId);
            // Store participant ID in localStorage for reconnections
            localStorage.setItem('wsParticipantId', data.participantId);
          }
          if (data.participants) {
            setParticipants(data.participants);
          }

          // If there are existing participants, request current status from the first participant only
          if (data.participants && data.participants.length > 0) {
            const firstParticipantId = data.participants[0]?.id;
            if (firstParticipantId) {
              const currentWs = wsRef.current;
              if (currentWs?.readyState === WebSocket.OPEN) {
                // Request background music status from first participant only
                currentWs.send(
                  JSON.stringify({
                    type: 'requestStatus',
                    id: data.id,
                    content: {
                      type: 'backgroundMusic',
                      targetParticipantId: firstParticipantId,
                    },
                  })
                );

                // Request ambiance status from first participant only
                ws.send(
                  JSON.stringify({
                    type: 'requestStatus',
                    id: data.id,
                    content: {
                      type: 'ambiance',
                      targetParticipantId: firstParticipantId,
                    },
                  })
                );
              }
            }
          }
          break;
        case 'participantJoined':
          if (data.participant) {
            setParticipants((prev) => [...prev, data.participant]);
            setStatusMessage(`New participant joined: ${data.participant.pseudo || 'Anonymous'}`);
          }
          break;
        case 'participantLeft':
          if (data.participantId) {
            setParticipants((prev) => prev.filter((p) => p.id !== data.participantId));
            setStatusMessage('A participant left the session');
          }
          break;
        default:
          break;
        }

        handlersRef.current.forEach((h) => h(data));
      } catch {
        /* ignore parse errors */
      }
    };

    ws.onclose = () => {
      setConnected(false);
      setStatusMessage(
        sessionId ? 'Session active. Reconnecting to server...' : 'Disconnected. Reconnecting...'
      );
      clearHeartbeat();
      if (shouldReconnectRef.current) {
        // eslint-disable-next-line react-hooks/immutability
        reconnectRef.current = setTimeout(connect, RECONNECT_MS);
      }
    };

    ws.onerror = () => {
      setStatusMessage('Connection error. Retrying...');
      ws.close();
    };
  }, [sessionId]);

  useEffect(() => {
    // Add a small delay to ensure page is fully loaded before connecting
    const connectionTimeout = setTimeout(() => {
      shouldReconnectRef.current = true;
      connect();
    }, 1000); // 500ms delay

    return () => {
      shouldReconnectRef.current = false;
      clearTimeout(connectionTimeout);
      clearHeartbeat();
      if (reconnectRef.current) {clearTimeout(reconnectRef.current);}
      wsRef.current?.close();
    };
  }, [connect]);

  const subscribe = useCallback((id: string) => {
    localStorage.setItem('lastJoinId', id);

    // Get stored participant ID for reconnection, or generate a new one
    const storedParticipantId = localStorage.getItem('wsParticipantId');
    const participantIdToUse = storedParticipantId || Math.random().toString(36).substring(2, 10);

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const userPseudo = localStorage.getItem('userPseudo');
      wsRef.current.send(
        JSON.stringify({
          type: 'subscribe',
          id: id,
          pseudo: userPseudo,
          participantId: participantIdToUse,
        })
      );
    } else {
      // WS is connecting — queue it; onopen will send it
      pendingIdRef.current = id;
      // Store the participant ID to use when connection opens
      localStorage.setItem('pendingParticipantId', participantIdToUse);
    }
  }, []);

  const disconnect = useCallback(() => {
    // Notify server about leaving the session
    if (sessionId && wsRef.current?.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(
          JSON.stringify({
            type: 'unsubscribe',
            id: sessionId,
            participantId: participantId,
          })
        );
      } catch {
        /* ignore errors */
      }
    }

    // Clear session state but keep the WS alive for future subscriptions
    localStorage.removeItem('lastJoinId');
    localStorage.removeItem('wsParticipantId');
    pendingIdRef.current = null;
    setSessionId(null);
    setParticipantId(null);
    setParticipants([]);
    setStatusMessage('Left session.');
  }, [sessionId, participantId]);

  const send = useCallback((msg: Record<string, unknown>) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  }, []);

  const addMessageHandler = useCallback((handler: MessageHandler) => {
    handlersRef.current.add(handler);
    return () => handlersRef.current.delete(handler);
  }, []);

  const contextValue = useMemo(
    () => ({
      connected,
      sessionId,
      statusMessage,
      participants,
      subscribe,
      disconnect,
      send,
      addMessageHandler,
    }),
    [
      connected,
      sessionId,
      statusMessage,
      participants,
      subscribe,
      disconnect,
      send,
      addMessageHandler,
    ]
  );

  return <SocketContext.Provider value={contextValue}>{children}</SocketContext.Provider>;
}

export function useSocketContext(): SocketContextValue {
  const ctx = useContext(SocketContext);
  if (!ctx) {throw new Error('useSocketContext must be used within SocketProvider');}
  return ctx;
}
