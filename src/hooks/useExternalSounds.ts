import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { apiFetch } from '../services/api';
import type { Sound, ExternalProvider } from '../types/sound';
import { useDeezer } from './useDeezer';
import { useSoundCloud } from './useSoundCloud';
import { useSpotify } from './useSpotify';
import { handleError } from '../utils/logger';
import type { ExternalSoundPayload } from '../contexts/SocketContext';
import { resolveExternalSound } from '../utils/resolveExternalSound';

export interface ExternalSoundRecord {
  id: string;
  dbId: number;
  filename: null;
  display_name: string;
  imageFile?: string;
  credit: string;
  contexts: [string, string][];
  isEnabled: boolean;
  isExternal: true;
  provider: ExternalProvider;
  providerTrackId: string;
  artist: string;
  title: string;
  album?: string;
  durationMs?: number;
  thumbnailUrl?: string;
  previewUrl?: string;
  permalinkUrl?: string;
}

export interface AddExternalSoundPayload {
  userId: string;
  provider: ExternalProvider;
  trackId: string;
  artist: string;
  title: string;
  album?: string;
  durationMs?: number;
  thumbnailUrl?: string;
  previewUrl?: string;
  permalinkUrl?: string;
  contexts?: [string, string][];
}

export function useExternalSounds(userId: string | null): {
  externalSounds: ExternalSoundRecord[];
  connectedProviders: ExternalProvider[];
  isSpotifyConnected: boolean;
  isDeezerConnected: boolean;
  isSoundCloudConnected: boolean;
  spotify: ReturnType<typeof useSpotify>;
  deezer: ReturnType<typeof useDeezer>;
  soundCloud: ReturnType<typeof useSoundCloud>;
  addExternalSound: (payload: AddExternalSoundPayload) => Promise<ExternalSoundRecord | null>;
  removeExternalSound: (dbId: number) => Promise<void>;
  updateExternalSound: (
    dbId: number,
    changes: { contexts?: [string, string][]; isEnabled?: boolean }
  ) => Promise<void>;
  playExternal: (sound: Sound) => Promise<void>;
  stopExternal: () => Promise<void>;
  reload: () => Promise<void>;
  resolveAndPlayExternal: (payload: ExternalSoundPayload) => Promise<Sound | null>;
} {
  const spotify = useSpotify();
  const deezer = useDeezer();
  const soundCloud = useSoundCloud();

  const [externalSounds, setExternalSounds] = useState<ExternalSoundRecord[]>([]);
  const activeProviderRef = useRef<ExternalProvider | null>(null);

  const isSpotifyConnected = spotify.isAuthenticated;
  const isDeezerConnected = deezer.isAuthenticated;
  const isSoundCloudConnected = soundCloud.isAuthenticated;

  const connectedProviders = useMemo<ExternalProvider[]>(
    () => [
      ...(isSpotifyConnected ? ['spotify' as ExternalProvider] : []),
      ...(isDeezerConnected ? ['deezer' as ExternalProvider] : []),
      ...(isSoundCloudConnected ? ['soundcloud' as ExternalProvider] : []),
    ],
    [isSpotifyConnected, isDeezerConnected, isSoundCloudConnected]
  );

  const reload = useCallback(async () => {
    if (!userId) {
      await Promise.resolve();
      setExternalSounds([]);
      return;
    }
    try {
      const data = await apiFetch<ExternalSoundRecord[]>(`/external-sounds?userId=${userId}`);
      setExternalSounds(data);
    } catch (error) {
      handleError(error, 'useExternalSounds.reload');
    }
  }, [userId]);

  useEffect(() => {
    Promise.resolve()
      .then(reload)
      .catch(() => {});
  }, [reload]);

  const addExternalSound = useCallback(
    async (payload: AddExternalSoundPayload): Promise<ExternalSoundRecord | null> => {
      try {
        const result = await apiFetch<ExternalSoundRecord>('/external-sounds', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        setExternalSounds((prev) => [...prev, result]);
        return result;
      } catch (error) {
        handleError(error, 'useExternalSounds.addExternalSound');
        return null;
      }
    },
    []
  );

  const removeExternalSound = useCallback(
    async (dbId: number) => {
      try {
        await apiFetch(`/external-sounds/${dbId}?userId=${userId}`, { method: 'DELETE' });
        setExternalSounds((prev) => prev.filter((s) => s.dbId !== dbId));
      } catch (error) {
        handleError(error, 'useExternalSounds.removeExternalSound');
      }
    },
    [userId]
  );

  const updateExternalSound = useCallback(
    async (dbId: number, changes: { contexts?: [string, string][]; isEnabled?: boolean }) => {
      try {
        await apiFetch(`/external-sounds/${dbId}`, {
          method: 'PATCH',
          body: JSON.stringify({ userId, ...changes }),
        });
        setExternalSounds((prev) =>
          prev.map((s) =>
            s.dbId === dbId
              ? {
                  ...s,
                  ...(changes.contexts !== undefined ? { contexts: changes.contexts } : {}),
                  ...(changes.isEnabled !== undefined ? { isEnabled: changes.isEnabled } : {}),
                }
              : s
          )
        );
      } catch (error) {
        handleError(error, 'useExternalSounds.updateExternalSound');
      }
    },
    [userId]
  );

  const playExternal = useCallback(
    async (sound: Sound) => {
      if (!sound.isExternal || !sound.provider || !sound.providerTrackId) {
        return;
      }

      // Stop the previously active provider if switching
      if (activeProviderRef.current && activeProviderRef.current !== sound.provider) {
        const prev = activeProviderRef.current;
        if (prev === 'spotify') {
          spotify.pause().catch(() => {});
        } else if (prev === 'deezer') {
          deezer.pause();
        } else if (prev === 'soundcloud') {
          soundCloud.pause().catch(() => {});
        }
      }

      activeProviderRef.current = sound.provider;

      switch (sound.provider) {
        case 'spotify': {
          // Spotify Web Playback SDK uses URIs
          const uri = `spotify:track:${sound.providerTrackId}`;
          await spotify.play(uri);
          break;
        }
        case 'deezer':
          deezer.play(sound.providerTrackId);
          break;
        case 'soundcloud': {
          // SoundCloud Widget needs the permalink URL; we stored it as providerTrackId
          await soundCloud.play(sound.providerTrackId);
          break;
        }
        default:
          break;
      }
    },
    [spotify, deezer, soundCloud]
  );

  const stopExternal = useCallback(async () => {
    if (!activeProviderRef.current) {
      return;
    }
    const provider = activeProviderRef.current;
    activeProviderRef.current = null;

    if (provider === 'spotify') {
      spotify.pause().catch(() => {});
    } else if (provider === 'deezer') {
      deezer.pause();
    } else if (provider === 'soundcloud') {
      soundCloud.pause().catch(() => {});
    }
  }, [spotify, deezer, soundCloud]);

  /**
   * Resolve and play an external sound received via WebSocket.
   * If the sender's provider is available, play directly.
   * Otherwise search for the track (by artist + title) on the first connected provider
   * and play that result — so the receiver always uses their own provider and sees its logo.
   * Returns the Sound as actually played (with the correct provider), or null if no provider is connected.
   */
  const resolveAndPlayExternal = useCallback(
    async (payload: ExternalSoundPayload): Promise<Sound | null> => {
      try {
        const sound = await resolveExternalSound(payload, connectedProviders, {
          spotify: spotify.search,
          deezer: deezer.search,
          soundcloud: soundCloud.search,
        });
        if (sound) {
          await playExternal(sound);
        }
        return sound;
      } catch (error) {
        handleError(error, 'useExternalSounds.resolveAndPlayExternal');
        return null;
      }
    },
    [connectedProviders, playExternal, spotify.search, deezer.search, soundCloud.search]
  );

  return {
    externalSounds,
    connectedProviders,
    isSpotifyConnected,
    isDeezerConnected,
    isSoundCloudConnected,
    spotify,
    deezer,
    soundCloud,
    addExternalSound,
    removeExternalSound,
    updateExternalSound,
    playExternal,
    stopExternal,
    reload,
    resolveAndPlayExternal,
  };
}
