import { useCallback, useEffect, useState } from 'react';
import {
  clearDeezerToken,
  deezerPause,
  deezerPlay,
  deezerResume,
  deezerSearch,
  deezerSetVolume,
  getDeezerAuthUrl,
  isDeezerTokenExpired,
  loadDeezerToken,
  loadDeezerSdk,
  parseDeezerCallback,
  saveDeezerToken,
  type DeezerSearchResult,
  type DeezerToken,
} from '../services/deezerService';
import { handleError } from '../utils/logger';

const CHANNEL_URL = `${globalThis.location.origin}/deezer-channel.html`;

export function useDeezer(): {
  isAuthenticated: boolean;
  isConnecting: boolean;
  token: DeezerToken | null;
  connect: () => void;
  disconnect: () => void;
  play: (trackId: string) => void;
  pause: () => void;
  resume: () => void;
  setVolume: (volume: number) => void;
  search: (query: string) => Promise<DeezerSearchResult[]>;
} {
  const [token, setToken] = useState<DeezerToken | null>(loadDeezerToken);
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    const t = loadDeezerToken();
    return Boolean(t) && !isDeezerTokenExpired(t);
  });
  const [isConnecting, setIsConnecting] = useState(false);

  // Handle OAuth implicit-grant redirect (token arrives in URL hash)
  useEffect(() => {
    const hash = globalThis.location.hash;
    if (!hash.includes('access_token')) return;

    const parsed = parseDeezerCallback(hash);
    if (!parsed) return;

    // Clean the hash from the URL
    globalThis.history.replaceState({}, '', globalThis.location.pathname + globalThis.location.search);

    saveDeezerToken(parsed);
    setToken(parsed);
    setIsAuthenticated(true);
    setIsConnecting(false);

    // Load the SDK now that we have a token
    loadDeezerSdk(CHANNEL_URL).catch(() => {});
  }, []);

  // Load the SDK if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      loadDeezerSdk(CHANNEL_URL).catch(() => {});
    }
  }, [isAuthenticated]);

  const connect = useCallback(() => {
    setIsConnecting(true);
    const url = getDeezerAuthUrl(`${globalThis.location.origin}/deezer-callback`);
    globalThis.location.href = url;
  }, []);

  const disconnect = useCallback(() => {
    clearDeezerToken();
    setToken(null);
    setIsAuthenticated(false);
  }, []);

  const play = useCallback((trackId: string) => {
    deezerPlay(trackId);
  }, []);

  const pause = useCallback(() => {
    deezerPause();
  }, []);

  const resume = useCallback(() => {
    deezerResume();
  }, []);

  const setVolume = useCallback((volume: number) => {
    deezerSetVolume(volume);
  }, []);

  const search = useCallback(
    async (query: string): Promise<DeezerSearchResult[]> => {
      try {
        return await deezerSearch(query);
      } catch (error) {
        handleError(error, 'useDeezer.search');
        return [];
      }
    },
    []
  );

  return {
    isAuthenticated,
    isConnecting,
    token,
    connect,
    disconnect,
    play,
    pause,
    resume,
    setVolume,
    search,
  };
}
