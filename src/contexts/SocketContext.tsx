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
  participantId?: string;
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
const isDevServer = globalThis.location.hostname === 'dev.chatluthier.org';
const protocol = globalThis.location.protocol === 'https:' ? 'wss:' : 'ws:';
const _WS_PORT = isLocalhost ? 3001 : isDevServer ? 4001 : Number(globalThis.location.port) + 1;
const WS_URL = isLocalhost
  ? 'ws://localhost:3001'
  : `${protocol}//${globalThis.location.hostname}/ws/`;

const RECONNECT_MS = 5000;
const HEARTBEAT_MS = 30_000;

export function SocketProvider({
  children,
}: Readonly<{ children: ReactNode }>): React.ReactElement {
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
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
    }
    heartbeatRef.current = null;
  };

  const setupHeartbeat = useCallback((ws: WebSocket) => {
    clearHeartbeat();
    heartbeatRef.current = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, HEARTBEAT_MS);
  }, []);

  const handleSubscription = useCallback(
    (ws: WebSocket, subscriptionParticipants: Array<{ id: string }>) => {
      // Request background music status from first participant
      if (ws.readyState === WebSocket.OPEN && subscriptionParticipants.length > 0) {
        const firstParticipantId = subscriptionParticipants[0].id;

        ws.send(
          JSON.stringify({
            type: 'requestStatus',
            id: sessionId,
            content: {
              type: 'backgroundMusic',
              targetParticipantId: firstParticipantId,
            },
          })
        );

        // Request ambiance status from first participant
        ws.send(
          JSON.stringify({
            type: 'requestStatus',
            id: sessionId,
            content: {
              type: 'ambiance',
              targetParticipantId: firstParticipantId,
            },
          })
        );
      }
    },
    [sessionId]
  );

  const handleSubscribedMessage = useCallback(
    (data: WsMessage) => {
      setSessionId(data.id ?? null);
      setStatusMessage(`Joined session: ${data.id ?? ''}`);

      if (data.participantId) {
        setParticipantId(data.participantId);
        localStorage.setItem('wsParticipantId', data.participantId);
      }

      if (data.participants) {
        setParticipants(data.participants);
        // Request status from first participant if available
        if (data.participants.length > 0 && data.id) {
          const currentWs = wsRef.current;
          if (currentWs) {
            handleSubscription(currentWs, data.participants);
          }
        }
      }
    },
    [handleSubscription]
  );

  const handleParticipantJoined = useCallback((data: WsMessage) => {
    if (data.participant !== undefined) {
      const participant = data.participant; // TypeScript now knows `participant` is defined
      setParticipants((prev) => [
        ...prev,
        {
          pseudo: participant.pseudo ?? null,
          isAnonymous: participant.isAnonymous ?? false,
          id: participant.id,
        },
      ]);
      setStatusMessage(`New participant joined: ${participant.pseudo || 'Anonymous'}`);
    }
  }, []);

  const handleParticipantLeft = useCallback((data: WsMessage) => {
    if (data.participantId) {
      setParticipants((prev) => prev.filter((p) => p.id !== data.participantId));
      setStatusMessage('A participant left the session');
    }
  }, []);

  const handleMessage = useCallback(
    (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data as string) as WsMessage;

        // Route message to appropriate handler
        switch (data.type) {
          case 'subscribed':
            handleSubscribedMessage(data);
            break;
          case 'participantJoined':
            handleParticipantJoined(data);
            break;
          case 'participantLeft':
            handleParticipantLeft(data);
            break;
          default:
            break;
        }

        // Notify all handlers
        handlersRef.current.forEach((h) => h(data));
      } catch {
        /* ignore parse errors */
      }
    },
    [handleSubscribedMessage, handleParticipantJoined, handleParticipantLeft]
  );

  const handleConnectionClose = useCallback(() => {
    setConnected(false);
    setStatusMessage(
      sessionId ? 'Session active. Reconnecting to server...' : 'Disconnected. Reconnecting...'
    );
    clearHeartbeat();

    if (shouldReconnectRef.current) {
      reconnectRef.current = setTimeout(connect, RECONNECT_MS);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  const handleConnectionError = useCallback(() => {
    setStatusMessage('Connection error. Retrying...');
    if (wsRef.current) {
      wsRef.current.close();
    }
  }, []);

  const getSessionIdToJoin = useCallback((): string | null => {
    // Priority: pending subscribe call > URL param > localStorage
    const urlParams = new URLSearchParams(globalThis.location.search);
    const urlId = urlParams.get('sessionId');
    const idToJoin = pendingIdRef.current ?? urlId ?? localStorage.getItem('lastJoinId');

    // Clean up URL param if present
    if (urlId) {
      urlParams.delete('sessionId');
      globalThis.history.replaceState(
        {},
        '',
        globalThis.location.pathname + (urlParams.toString() ? `?${urlParams}` : '')
      );
    }

    return idToJoin;
  }, []);

  const sendSubscriptionRequest = useCallback((ws: WebSocket, targetSessionId: string) => {
    const userPseudo = localStorage.getItem('userPseudo') || null;
    const storedParticipantId =
      localStorage.getItem('pendingParticipantId') ||
      localStorage.getItem('wsParticipantId') ||
      null;

    ws.send(
      JSON.stringify({
        type: 'subscribe',
        id: targetSessionId,
        pseudo: userPseudo,
        participantId: storedParticipantId,
      })
    );

    // Clean up pending IDs
    pendingIdRef.current = null;
    localStorage.removeItem('pendingParticipantId');
  }, []);

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

    const handleOpen = () => {
      clearTimeout(connectionTimeout);
      setConnected(true);
      setStatusMessage('Connected to session server. Ready to join or create a session.');
      setupHeartbeat(ws);

      const sessionIdToJoin = getSessionIdToJoin();
      if (sessionIdToJoin) {
        sendSubscriptionRequest(ws, sessionIdToJoin);
      }
    };

    ws.onopen = handleOpen;
    ws.onmessage = handleMessage;
    ws.onclose = handleConnectionClose;
    ws.onerror = handleConnectionError;
  }, [
    handleMessage,
    handleConnectionClose,
    handleConnectionError,
    getSessionIdToJoin,
    sendSubscriptionRequest,
    setupHeartbeat,
  ]);

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
      if (reconnectRef.current) {
        clearTimeout(reconnectRef.current);
      }
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
    // Clear session state but keep the WS alive for future subscriptions
    localStorage.removeItem('lastJoinId');
    localStorage.removeItem('wsParticipantId');
    pendingIdRef.current = null;
    setSessionId(null);
    setParticipantId(null);
    setParticipants([]);
    setStatusMessage('Left session.');

    // Notify server about leaving the session
    const shouldNotifyServer =
      sessionId && wsRef.current?.readyState === WebSocket.OPEN && participantId;
    if (shouldNotifyServer) {
      const unsubscribeMessage = JSON.stringify({
        type: 'unsubscribe',
        id: sessionId,
        participantId: participantId,
      });

      try {
        wsRef.current?.send(unsubscribeMessage);
      } catch {
        /* ignore errors */
      }
    }
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
  if (!ctx) {
    throw new Error('useSocketContext must be used within SocketProvider');
  }
  return ctx;
}
