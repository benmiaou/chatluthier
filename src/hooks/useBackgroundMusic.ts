import { useCallback, useEffect, useRef, useState } from 'react';
import { AudioPlayer, precacheAudio } from './useAudioPlayer';
import type { Sound } from '../types/sound';
import { BackgroundMusicCategories, bgMatchesCategory, bgScenes } from '../types/sound';
import { handleError } from '../utils/logger';
import type { ExternalSoundPayload } from '../contexts/SocketContext';

const ASSET_PREFIX = '/assets/background/';

type BackgroundMusicCategory =
  (typeof BackgroundMusicCategories)[keyof typeof BackgroundMusicCategories];

interface BackgroundMusicHook {
  sounds: Sound[];
  currentSound: Sound | null;
  activeCategory: BackgroundMusicCategory | null;
  isPlaying: boolean;
  volume: number;
  progress: number;
  context: string;
  userInteracted: boolean;
  disableExternalSounds: boolean;
  setUserInteracted: (interacted: boolean) => void;
  setDisableExternalSounds: (disabled: boolean) => void;
  loadSounds: () => Promise<void>;
  playCategory: (category: BackgroundMusicCategory) => Promise<void>;
  playSpecificSound: (sound: Sound) => Promise<void>;
  next: () => void;
  stop: () => void;
  setVolume: (volume: number) => void;
  handleSetVolume: (volume: number) => void;
  seekTo: (time: number) => void;
  handleSetContext: (context: string) => void;
  getCurrentTime: () => number;
  playReceived: (musicData: {
    filename: string;
    credit?: string;
    timestamp?: number;
    currentTime?: number;
    externalSound?: ExternalSoundPayload;
  }) => Promise<void>;
  playExternalReceived: (payload: ExternalSoundPayload) => Promise<void>;
  stopReceived: () => void;
}

export function useBackgroundMusic(
  userId: string | null,
  onAutoplayBlocked?: () => void,
  onPlayExternal?: (sound: Sound) => Promise<void>,
  onStopExternal?: () => Promise<void>
): BackgroundMusicHook {
  const playerRef = useRef<AudioPlayer>(new AudioPlayer());
  const [sounds, setSounds] = useState<Sound[]>([]);
  const [currentSound, setCurrentSound] = useState<Sound | null>(null);
  const [activeCategory, setActiveCategory] = useState<BackgroundMusicCategory | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.5);
  const [progress, setProgress] = useState(0);
  const [context, setContext] = useState('All');
  const [userInteracted, setUserInteracted] = useState(false);
  const [disableExternalSounds, setDisableExternalSounds] = useState(false);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Keep callbacks in refs so closures always see latest values
  const onPlayExternalRef = useRef(onPlayExternal);
  const onStopExternalRef = useRef(onStopExternal);
  useEffect(() => {
    onPlayExternalRef.current = onPlayExternal;
  }, [onPlayExternal]);
  useEffect(() => {
    onStopExternalRef.current = onStopExternal;
  }, [onStopExternal]);

  // ─── Load sounds ──────────────────────────────────────────────────────────

  const loadSounds = useCallback(async () => {
    try {
      const main: Sound[] = await fetch('/backgroundMusic').then((r) => r.json());
      let userSounds: Sound[] = [];
      if (userId) {
        userSounds = await fetch(`/backgroundMusic?userId=${userId}`).then((r) => r.json());
      }

      // Separate local and external sounds from userSounds
      const userExternalSounds = userSounds.filter((s) => s.isExternal);
      const userLocalSounds = userSounds.filter((s) => !s.isExternal);

      const merged = main.map((s) => {
        const u = userLocalSounds.find((us) => us.filename === s.filename);
        const base = u ? { ...s, ...u } : s;
        return { ...base, name: base.name ?? base.display_name ?? base.filename };
      });

      // External sounds don't have local files — don't try to precache them
      const withExternal = [
        ...merged,
        ...userExternalSounds.map((s) => ({
          ...s,
          name: s.name ?? s.display_name ?? `${s.artist} – ${s.title}`,
        })),
      ];

      setSounds(withExternal);
      precacheAudio(
        merged.filter((s) => !s.isExternal && s.filename).map((s) => `${ASSET_PREFIX}${s.filename}`)
      );
    } catch (error) {
      handleError(error, 'useBackgroundMusic.loadSounds');
    }
  }, [userId]);

  useEffect(() => {
    const load = async () => {
      await loadSounds();
    };
    load();
  }, [loadSounds]);

  // ─── Progress bar ─────────────────────────────────────────────────────────

  const startProgressTracking = () => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }
    progressIntervalRef.current = setInterval(() => {
      const el = playerRef.current.getElement();
      if (el.duration) {
        setProgress((el.currentTime / el.duration) * 100);
      }
    }, 500);
  };

  const stopProgressTracking = () => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }
    progressIntervalRef.current = null;
    setProgress(0);
  };

  // ─── Play a specific sound ──────────────────────────────────────────────

  const playSpecificSound = useCallback(
    async (sound: Sound) => {
      setCurrentSound(sound);

      // External sounds are routed to the provider SDK
      if (sound.isExternal) {
        if (onPlayExternalRef.current) {
          await onPlayExternalRef.current(sound);
          setIsPlaying(true);
          stopProgressTracking();
        }
        return;
      }

      // Stop any active external playback when switching to local
      if (onStopExternalRef.current) {
        onStopExternalRef.current().catch(() => {});
      }

      const categories: BackgroundMusicCategory[] = [
        BackgroundMusicCategories.CALM,
        BackgroundMusicCategories.DYNAMIC,
        BackgroundMusicCategories.INTENSE,
        BackgroundMusicCategories.ALL,
      ];
      const soundCategory = categories.find((category) => bgMatchesCategory(sound, category));

      if (soundCategory) {
        setActiveCategory(soundCategory);
      }

      const audio = playerRef.current.getElement();
      audio.src = `${ASSET_PREFIX}${sound.filename}`;
      audio.volume = volume;
      audio.onended = () => {};
      await audio.play();
      setIsPlaying(true);
      startProgressTracking();
    },
    [volume]
  );

  // ─── Play a category ──────────────────────────────────────────────────────

  const playCategory = useCallback(
    async (category: BackgroundMusicCategory) => {
      const filtered = sounds.filter(
        (s) =>
          // Skip external sounds when disabled
          !(s.isExternal && disableExternalSounds) &&
          bgMatchesCategory(s, category) &&
          (context.toLowerCase() === 'all' || bgScenes(s).includes(context.toLowerCase()))
      );
      if (!filtered.length) {
        return;
      }
      const pick = filtered[Math.floor(Math.random() * filtered.length)];
      setCurrentSound(pick);
      setActiveCategory(category);

      if (pick.isExternal) {
        if (onPlayExternalRef.current) {
          await onPlayExternalRef.current(pick);
          setIsPlaying(true);
        }
        return;
      }

      // Stop any active external playback
      if (onStopExternalRef.current) {
        onStopExternalRef.current().catch(() => {});
      }

      const audio = playerRef.current.getElement();
      audio.src = `${ASSET_PREFIX}${pick.filename}`;
      audio.volume = volume;
      audio.onended = () => {
        if (activeCategory === category) {
          const autoAdvanceFiltered = sounds.filter(
            (s) =>
              !(s.isExternal && disableExternalSounds) &&
              bgMatchesCategory(s, category) &&
              (context.toLowerCase() === 'all' || bgScenes(s).includes(context.toLowerCase()))
          );
          if (autoAdvanceFiltered.length > 0) {
            const currentIndex = autoAdvanceFiltered.findIndex((s) => s.filename === pick.filename);
            const nextIndex = (currentIndex + 1) % autoAdvanceFiltered.length;
            const nextSound = autoAdvanceFiltered[nextIndex];
            playSpecificSound(nextSound).catch(() => {});
          }
        }
      };
      await audio.play();
      setIsPlaying(true);
      startProgressTracking();
    },
    [sounds, volume, context, activeCategory, disableExternalSounds, playSpecificSound]
  );

  const next = useCallback(() => {
    if (activeCategory) {
      playCategory(activeCategory);
    }
  }, [activeCategory, playCategory]);

  const stop = useCallback(() => {
    playerRef.current.stop();
    setIsPlaying(false);
    setCurrentSound(null);
    setActiveCategory(null);
    stopProgressTracking();
    // Also stop any active external playback
    if (onStopExternalRef.current) {
      onStopExternalRef.current().catch(() => {});
    }
  }, []);

  const handleSetVolume = useCallback((v: number) => {
    setVolume(v);
    playerRef.current.setVolume(v);
  }, []);

  const seekTo = useCallback((pct: number) => {
    const el = playerRef.current.getElement();
    if (el.duration) {
      el.currentTime = (pct / 100) * el.duration;
    }
  }, []);

  const getCurrentTime = useCallback(() => {
    const el = playerRef.current.getElement();
    return el.currentTime;
  }, []);

  const handleSetContext = useCallback((ctx: string) => {
    setContext(ctx);
  }, []);

  // ─── Remote playback (received via socket) ────────────────────────────────

  const calculateAdjustedTime = useCallback((timestamp: number, currentTime: number): number => {
    const now = Date.now();
    const delay = now - timestamp;
    return currentTime + delay / 1000;
  }, []);

  const handlePlayAttempt = useCallback(
    async (audio: HTMLAudioElement): Promise<boolean> => {
      const handleAutoplayBlocked = () => {
        setIsPlaying(false);
        if (onAutoplayBlocked) {
          onAutoplayBlocked();
        }
      };

      const handleOtherErrors = () => {
        setIsPlaying(false);
      };

      try {
        if (userInteracted) {
          await audio.play();
          setIsPlaying(true);
          return true;
        }
        handleAutoplayBlocked();
        return false;
      } catch (error) {
        if (error instanceof Error && error.name === 'NotAllowedError') {
          handleAutoplayBlocked();
        } else {
          handleOtherErrors();
        }
        return false;
      }
    },
    [userInteracted, onAutoplayBlocked]
  );

  const updateCurrentSound = useCallback(
    (musicData: { filename: string; credit?: string }) => {
      const soundToPlay = sounds.find((s) => s.filename === musicData.filename);
      if (soundToPlay) {
        setCurrentSound({ ...soundToPlay, credit: musicData.credit });
      } else {
        setCurrentSound({
          filename: musicData.filename,
          credit: musicData.credit,
          name: musicData.filename,
          id: '',
          category: '',
        } as Sound);
      }
    },
    [sounds]
  );

  /** Called when receiving a backgroundMusicChange with an externalSound payload */
  const playExternalReceived = useCallback(
    async (payload: ExternalSoundPayload) => {
      if (disableExternalSounds) {
        return;
      }

      // Find the matching sound in our list (if the user has it saved)
      const match = sounds.find(
        (s) =>
          s.isExternal && s.provider === payload.provider && s.providerTrackId === payload.trackId
      );

      const soundToPlay: Sound = match ?? {
        id: `ext_recv_${payload.trackId}`,
        name: payload.title ? `${payload.artist} – ${payload.title}` : payload.trackId,
        filename: null,
        category: 'background',
        isExternal: true,
        provider: payload.provider,
        providerTrackId: payload.trackId,
        artist: payload.artist,
        title: payload.title,
        thumbnailUrl: payload.thumbnailUrl,
        previewUrl: payload.previewUrl,
      };

      setCurrentSound(soundToPlay);
      if (onPlayExternalRef.current) {
        await onPlayExternalRef.current(soundToPlay);
        setIsPlaying(true);
      }
    },
    [sounds, disableExternalSounds]
  );

  const playReceived = useCallback(
    async (musicData: {
      filename: string;
      credit?: string;
      timestamp?: number;
      currentTime?: number;
      externalSound?: ExternalSoundPayload;
    }) => {
      // If an external sound payload is present and we have a matching local sound record, play it
      if (musicData.externalSound) {
        await playExternalReceived(musicData.externalSound);
        return;
      }

      const audio = playerRef.current.getElement();
      audio.src = `${ASSET_PREFIX}${musicData.filename}`;
      audio.volume = volume;

      if (musicData.timestamp && musicData.currentTime !== undefined) {
        audio.currentTime = calculateAdjustedTime(musicData.timestamp, musicData.currentTime);
      }

      await handlePlayAttempt(audio);
      updateCurrentSound(musicData);
      startProgressTracking();
    },
    [volume, calculateAdjustedTime, handlePlayAttempt, updateCurrentSound, playExternalReceived]
  );

  const stopReceived = useCallback(() => {
    stop();
  }, [stop]);

  useEffect(() => {
    return () => stopProgressTracking();
  }, []);

  return {
    sounds,
    currentSound,
    activeCategory,
    isPlaying,
    volume,
    progress,
    context,
    loadSounds,
    playCategory,
    playSpecificSound,
    next,
    stop,
    setVolume: handleSetVolume,
    handleSetVolume,
    seekTo,
    handleSetContext,
    playReceived,
    playExternalReceived,
    stopReceived,
    getCurrentTime,
    userInteracted,
    setUserInteracted,
    disableExternalSounds,
    setDisableExternalSounds,
  };
}
