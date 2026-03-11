import { useCallback, useEffect, useState } from 'react';
import {
  clearSoundCloudToken,
  exchangeSoundCloudCode,
  getSoundCloudAuthUrl,
  isSoundCloudTokenExpired,
  loadSoundCloudToken,
  refreshSoundCloudToken,
  saveSoundCloudToken,
  soundCloudPause,
  soundCloudPlay,
  soundCloudResume,
  soundCloudSearch,
  soundCloudSetVolume,
  type SoundCloudSearchResult,
  type SoundCloudToken,
} from '../services/soundcloudService';
import { handleError } from '../utils/logger';

export function useSoundCloud(): {
  isAuthenticated: boolean;
  isConnecting: boolean;
  token: SoundCloudToken | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  play: (permalinkUrl: string) => Promise<void>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  setVolume: (volume: number) => Promise<void>;
  search: (query: string) => Promise<SoundCloudSearchResult[]>;
} {
  const [token, setToken] = useState<SoundCloudToken | null>(loadSoundCloudToken);
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    const t = loadSoundCloudToken();
    return Boolean(t) && !isSoundCloudTokenExpired(t);
  });
  const [isConnecting, setIsConnecting] = useState(false);

  // Handle OAuth authorization code callback
  useEffect(() => {
    const params = new URLSearchParams(globalThis.location.search);
    const code = params.get('code');
    if (!code) return;

    // Check we're on the SoundCloud callback (verifier stored in sessionStorage)
    if (!sessionStorage.getItem('soundcloud_code_verifier')) return;

    params.delete('code');
    params.delete('state');
    globalThis.history.replaceState({}, '', `${globalThis.location.pathname}?${params}`);

    exchangeSoundCloudCode(code)
      .then((t) => {
        setToken(t);
        setIsAuthenticated(true);
        setIsConnecting(false);
      })
      .catch((err) => {
        handleError(err, 'useSoundCloud.exchangeCode');
        setIsConnecting(false);
      });
  }, []);

  // Auto-refresh when token is near expiry
  const ensureValidToken = useCallback(async (): Promise<string | null> => {
    let t = token;
    if (!t) return null;
    if (isSoundCloudTokenExpired(t)) {
      if (!t.refresh_token) return null;
      try {
        t = await refreshSoundCloudToken(t.refresh_token);
        setToken(t);
        saveSoundCloudToken(t);
      } catch {
        return null;
      }
    }
    return t.access_token;
  }, [token]);

  const connect = useCallback(async () => {
    setIsConnecting(true);
    const url = await getSoundCloudAuthUrl();
    globalThis.location.href = url;
  }, []);

  const disconnect = useCallback(() => {
    clearSoundCloudToken();
    setToken(null);
    setIsAuthenticated(false);
  }, []);

  const play = useCallback(async (permalinkUrl: string) => {
    await soundCloudPlay(permalinkUrl);
  }, []);

  const pause = useCallback(async () => {
    await soundCloudPause();
  }, []);

  const resume = useCallback(async () => {
    await soundCloudResume();
  }, []);

  const setVolume = useCallback(async (volume: number) => {
    await soundCloudSetVolume(volume);
  }, []);

  const search = useCallback(
    async (query: string): Promise<SoundCloudSearchResult[]> => {
      try {
        const accessToken = await ensureValidToken();
        return await soundCloudSearch(query, accessToken);
      } catch (error) {
        handleError(error, 'useSoundCloud.search');
        return [];
      }
    },
    [ensureValidToken]
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
