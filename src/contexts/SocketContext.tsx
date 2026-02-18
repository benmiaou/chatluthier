import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';

export type WsMessageType =
  | 'backgroundMusicChange'
  | 'backgroundMusicStop'
  | 'playSoundboardSound'
  | 'ambianceStatusUpdate'
  | 'message'
  | 'subscribed'
  | 'error';

export interface WsMessage {
  type: WsMessageType;
  id?: string;
  content?: unknown;
  message?: string;
}

type MessageHandler = (msg: WsMessage) => void;

interface SocketContextValue {
  connected: boolean;
  sessionId: string | null;
  statusMessage: string;
  subscribe: (id: string) => void;
  disconnect: () => void;
  send: (msg: Record<string, unknown>) => void;
  addMessageHandler: (handler: MessageHandler) => () => void;
}

const SocketContext = createContext<SocketContextValue | null>(null);

const WS_URL =
  window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'ws://localhost:3001'
    : `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws/`;

const RECONNECT_MS = 5000;
const HEARTBEAT_MS = 30_000;

export function SocketProvider({ children }: { children: ReactNode }) {
  const wsRef = useRef<WebSocket | null>(null);
  const handlersRef = useRef<Set<MessageHandler>>(new Set());
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shouldReconnectRef = useRef(true);
  // ID to subscribe to on next open (set by subscribe() when WS isn't ready yet)
  const pendingIdRef = useRef<string | null>(null);

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  const clearHeartbeat = () => {
    if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    heartbeatRef.current = null;
  };

  const connect = useCallback(() => {
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      clearHeartbeat();
      heartbeatRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'ping' }));
      }, HEARTBEAT_MS);

      // Priority: pending subscribe call > URL param > localStorage
      const urlParams = new URLSearchParams(window.location.search);
      const urlId = urlParams.get('sessionId');
      const idToJoin = pendingIdRef.current ?? urlId ?? localStorage.getItem('lastJoinId');

      if (idToJoin) {
        ws.send(JSON.stringify({ type: 'subscribe', id: idToJoin }));
        pendingIdRef.current = null;
        if (urlId) {
          urlParams.delete('sessionId');
          window.history.replaceState({}, '', window.location.pathname + (urlParams.toString() ? `?${urlParams}` : ''));
        }
      }
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data as string) as WsMessage;
        if (data.type === 'subscribed') {
          setSessionId(data.id ?? null);
          setStatusMessage(`Joined session: ${data.id ?? ''}`);
        }
        handlersRef.current.forEach((h) => h(data));
      } catch {
        /* ignore parse errors */
      }
    };

    ws.onclose = () => {
      setConnected(false);
      clearHeartbeat();
      if (shouldReconnectRef.current) {
        reconnectRef.current = setTimeout(connect, RECONNECT_MS);
      }
    };

    ws.onerror = () => ws.close();
  }, []);

  useEffect(() => {
    shouldReconnectRef.current = true;
    connect();
    return () => {
      shouldReconnectRef.current = false;
      clearHeartbeat();
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
      wsRef.current?.close();
    };
  }, [connect]);

  const subscribe = useCallback((id: string) => {
    localStorage.setItem('lastJoinId', id);
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'subscribe', id }));
    } else {
      // WS is connecting — queue it; onopen will send it
      pendingIdRef.current = id;
    }
  }, []);

  const disconnect = useCallback(() => {
    // Clear session state but keep the WS alive for future subscriptions
    localStorage.removeItem('lastJoinId');
    pendingIdRef.current = null;
    setSessionId(null);
    setStatusMessage('Left session.');
  }, []);

  const send = useCallback((msg: Record<string, unknown>) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  }, []);

  const addMessageHandler = useCallback((handler: MessageHandler) => {
    handlersRef.current.add(handler);
    return () => handlersRef.current.delete(handler);
  }, []);

  return (
    <SocketContext.Provider
      value={{ connected, sessionId, statusMessage, subscribe, disconnect, send, addMessageHandler }}
    >
      {children}
    </SocketContext.Provider>
  );
}

export function useSocketContext(): SocketContextValue {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error('useSocketContext must be used within SocketProvider');
  return ctx;
}
