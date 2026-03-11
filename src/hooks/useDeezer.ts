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
  // Process OAuth redirect hash once at initialization time (lazy initializer avoids effect setState)
  const [hashToken] = useState<DeezerToken | null>(() => {
    const hash = globalThis.location.hash;
    if (!hash.includes('access_token')) {
      return null;
    }
    const parsed = parseDeezerCallback(hash);
    if (!parsed) {
      return null;
    }
    saveDeezerToken(parsed);
    return parsed;
  });

  const [token, setToken] = useState<DeezerToken | null>(() => hashToken ?? loadDeezerToken());
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    const t = hashToken ?? loadDeezerToken();
    return Boolean(t) && !isDeezerTokenExpired(t);
  });
  const [isConnecting, setIsConnecting] = useState(false);

  // Side-effects only for OAuth redirect: clean URL and load SDK
  useEffect(() => {
    if (!hashToken) {
      return;
    }
    globalThis.history.replaceState(
      {},
      '',
      globalThis.location.pathname + globalThis.location.search
    );
    loadDeezerSdk(CHANNEL_URL).catch(() => {});
  }, [hashToken]);

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

  const search = useCallback(async (query: string): Promise<DeezerSearchResult[]> => {
    try {
      return await deezerSearch(query);
    } catch (error) {
      handleError(error, 'useDeezer.search');
      return [];
    }
  }, []);

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
