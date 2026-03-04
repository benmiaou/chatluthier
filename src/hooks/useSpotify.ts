import { useCallback, useEffect, useRef, useState } from 'react';
import {
  clearToken,
  exchangeSpotifyCode,
  getSpotifyAuthUrl,
  isTokenExpired,
  loadToken,
  refreshSpotifyToken,
  spotifyGetPlaybackState,
  spotifyGetPlaylists,
  spotifyNext,
  spotifyPause,
  spotifyPlay,
  spotifySetVolume,
} from '../services/spotifyService';
import type { SpotifyPlaylist, SpotifyPlaybackState, SpotifyToken } from '../types/spotify';

export function useSpotify(): {
  isAuthenticated: boolean;
  isConnecting: boolean;
  token: SpotifyToken | null;
  playbackState: SpotifyPlaybackState | null;
  playlists: SpotifyPlaylist[];
  connect: () => Promise<void>;
  disconnect: () => void;
  play: (uri: string) => Promise<void>;
  pause: () => Promise<void>;
  next: () => Promise<void>;
  setVolume: (volume: number) => Promise<void>;
  fetchPlaylists: () => Promise<void>;
  } {
  const [token, setToken] = useState<SpotifyToken | null>(loadToken);
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    const t = loadToken();
    return Boolean(t) && !isTokenExpired(t);
  });
  const [playbackState, setPlaybackState] = useState<SpotifyPlaybackState | null>(null);
  const [playlists, setPlaylists] = useState<{ id: string; name: string; uri: string }[]>([]);
  const [isConnecting, setIsConnecting] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ─── Auto-handle auth callback on mount ──────────────────────────────────

  useEffect(() => {
    const params = new URLSearchParams(globalThis.location.search);
    const code = params.get('code');
    if (!code) {
      return;
    }

    params.delete('code');
    params.delete('state');
    globalThis.history.replaceState({}, '', `${globalThis.location.pathname}?${params}`);

    exchangeSpotifyCode(code)
      .then((t) => {
        setToken(t);
        setIsAuthenticated(true);
      })
      .catch(() => {});
  }, []);

  // ─── Refresh token when expired ───────────────────────────────────────────

  const ensureValidToken = useCallback(async (): Promise<string | null> => {
    let t = token;
    if (!t) {
      return null;
    }
    if (isTokenExpired(t)) {
      if (!t.refresh_token) {
        return null;
      }
      t = await refreshSpotifyToken(t.refresh_token);
      setToken(t);
    }
    return t.access_token;
  }, [token]);

  // ─── Connect / disconnect ─────────────────────────────────────────────────

  const connect = useCallback(async () => {
    setIsConnecting(true);
    const url = await getSpotifyAuthUrl();
    globalThis.location.href = url;
  }, []);

  const disconnect = useCallback(() => {
    clearToken();
    setToken(null);
    setIsAuthenticated(false);
    setPlaybackState(null);
    setPlaylists([]);
    if (pollRef.current) {
      clearInterval(pollRef.current);
    }
  }, []);

  // ─── Playback controls ────────────────────────────────────────────────────

  const play = useCallback(
    async (contextUri?: string) => {
      const accessToken = await ensureValidToken();
      if (accessToken) {
        await spotifyPlay(accessToken, contextUri);
      }
    },
    [ensureValidToken]
  );

  const pause = useCallback(async () => {
    const accessToken = await ensureValidToken();
    if (accessToken) {
      await spotifyPause(accessToken);
    }
  }, [ensureValidToken]);

  const next = useCallback(async () => {
    const accessToken = await ensureValidToken();
    if (accessToken) {
      await spotifyNext(accessToken);
    }
  }, [ensureValidToken]);

  const setVolume = useCallback(
    async (volumePercent: number) => {
      const accessToken = await ensureValidToken();
      if (accessToken) {
        await spotifySetVolume(accessToken, volumePercent * 100);
      }
    },
    [ensureValidToken]
  );

  // ─── Polling for playback state ───────────────────────────────────────────

  const fetchPlaybackState = useCallback(async () => {
    const accessToken = await ensureValidToken();
    if (!accessToken) {
      return;
    }
    const state = await spotifyGetPlaybackState(accessToken);
    setPlaybackState(state);
  }, [ensureValidToken]);

  const fetchPlaylists = useCallback(async () => {
    const accessToken = await ensureValidToken();
    if (!accessToken) {
      return;
    }
    const items = await spotifyGetPlaylists(accessToken);
    setPlaylists(items.map((p: { id: string; name: string; uri: string }) => p));
  }, [ensureValidToken]);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }
    const fetchInitial = async () => {
      await fetchPlaybackState();
      await fetchPlaylists();
    };
    fetchInitial();
    pollRef.current = setInterval(fetchPlaybackState, 5000);
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
      }
    };
  }, [isAuthenticated, fetchPlaybackState, fetchPlaylists]);

  return {
    isAuthenticated,
    isConnecting,
    token,
    playbackState,
    playlists,
    connect,
    disconnect,
    play,
    pause,
    next,
    setVolume,
    fetchPlaylists,
  };
}
