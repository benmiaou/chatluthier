import { useCallback, useEffect, useRef, useState } from 'react';
import { AudioPlayer, precacheAudio } from './useAudioPlayer';
import type { Sound } from '../types/sound';
import { BackgroundMusicCategories, bgMatchesCategory, bgScenes } from '../types/sound';

const ASSET_PREFIX = '/assets/background/';

type BackgroundMusicCategory = keyof typeof BackgroundMusicCategories;

interface BackgroundMusicHook {
  sounds: Sound[];
  currentSound: Sound | null;
  activeCategory: BackgroundMusicCategory | null;
  isPlaying: boolean;
  volume: number;
  progress: number;
  context: string;
  loadSounds: () => Promise<void>;
  playCategory: (category: BackgroundMusicCategory) => Promise<void>;
  playSpecificSound: (sound: Sound) => Promise<void>;
  next: () => void;
  stop: () => void;
  setVolume: (volume: number) => void;
  seekTo: (time: number) => void;
  setContext: (context: string) => void;
  getCurrentTime: () => number;
}

export function useBackgroundMusic(
  userId: string | null,
  onAutoplayBlocked?: () => void
): BackgroundMusicHook {
  const playerRef = useRef<AudioPlayer>(new AudioPlayer());
  const [sounds, setSounds] = useState<Sound[]>([]);
  const [currentSound, setCurrentSound] = useState<Sound | null>(null);
  const [activeCategory, setActiveCategory] = useState<BackgroundMusicCategory | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolumeState] = useState(0.5);
  const [progress, setProgress] = useState(0); // 0–100
  const [context, setContextState] = useState('All');
  const [userInteracted, setUserInteracted] = useState(false);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ─── Load sounds ──────────────────────────────────────────────────────────

  const loadSounds = useCallback(async () => {
    try {
      const main: Sound[] = await fetch('/backgroundMusic').then((r) => r.json());
      let userSounds: Sound[] = [];
      if (userId) {
        userSounds = await fetch(`/backgroundMusic?userId=${userId}`).then((r) => r.json());
      }
      const merged = main.map((s) => {
        const u = userSounds.find((us) => us.filename === s.filename);
        const base = u ? { ...s, ...u } : s;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return { ...base, name: base.name ?? (base as any).display_name ?? base.filename };
      });
      setSounds(merged);
      precacheAudio(merged.map((s) => `${ASSET_PREFIX}${s.filename}`));
    } catch (_err) {
      // Failed to load background sounds
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

      // Find which category this sound belongs to
      const soundCategory = Object.values(BackgroundMusicCategories).find((category) =>
        bgMatchesCategory(sound, category)
      ) as BackgroundMusicCategory | undefined;

      if (soundCategory) {
        setActiveCategory(soundCategory);
      }

      const audio = playerRef.current.getElement();
      audio.src = `${ASSET_PREFIX}${sound.filename}`;
      audio.volume = volume;
      // Note: Auto-advance is handled by the playCategory function, not here
      // This avoids circular dependency issues
      audio.onended = () => {
        // No auto-advance here to avoid circular dependency
      };
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
          bgMatchesCategory(s, category) && (context === 'All' || bgScenes(s).includes(context))
      );
      if (!filtered.length) {
        return;
      }
      const pick = filtered[Math.floor(Math.random() * filtered.length)];
      setCurrentSound(pick);
      setActiveCategory(category);

      const audio = playerRef.current.getElement();
      audio.src = `${ASSET_PREFIX}${pick.filename}`;
      audio.volume = volume;
      // Auto-advance to next in category when current sound ends
      audio.onended = () => {
        if (activeCategory === category) {
          // Manually implement next logic to avoid circular dependency
          const autoAdvanceFiltered = sounds.filter(
            (s) =>
              bgMatchesCategory(s, category) && (context === 'All' || bgScenes(s).includes(context))
          );
          if (autoAdvanceFiltered.length > 0) {
            const currentIndex = autoAdvanceFiltered.findIndex((s) => s.filename === pick.filename);
            const nextIndex = (currentIndex + 1) % autoAdvanceFiltered.length;
            const nextSound = autoAdvanceFiltered[nextIndex];
            playSpecificSound(nextSound).catch(() => {});
          }
        }
      }; // auto-advance to next in category
      await audio.play();
      setIsPlaying(true);
      startProgressTracking();
    },
    [sounds, volume, context, activeCategory, playSpecificSound]
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
  }, []);

  const setVolume = useCallback((v: number) => {
    setVolumeState(v);
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

  const setContext = useCallback((ctx: string) => {
    setContextState(ctx);
  }, []);

  // ─── Remote playback (received via socket) ────────────────────────────────

  const calculateAdjustedTime = useCallback((timestamp: number, currentTime: number): number => {
    const now = Date.now();
    const delay = now - timestamp;
    return currentTime + delay / 1000; // Convert delay from ms to seconds
  }, []);

  const handlePlayAttempt = useCallback(async (audio: HTMLAudioElement): Promise<boolean> => {
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
  }, [userInteracted, onAutoplayBlocked]);

  const updateCurrentSound = useCallback((musicData: {
    filename: string;
    credit?: string;
  }) => {
    const soundToPlay = sounds.find((s) => s.filename === musicData.filename);
    if (soundToPlay) {
      setCurrentSound({ ...soundToPlay, credit: musicData.credit });
    } else {
      setCurrentSound({
        filename: musicData.filename,
        credit: musicData.credit,
        name: musicData.filename,
        display_name: musicData.filename,
      } as Sound);
    }
  }, [sounds]);

  const playReceived = useCallback(
    async (musicData: {
      filename: string;
      credit?: string;
      timestamp?: number;
      currentTime?: number;
    }) => {
      const audio = playerRef.current.getElement();
      audio.src = `${ASSET_PREFIX}${musicData.filename}`;
      audio.volume = volume;

      // Set adjusted time if timestamp and currentTime are provided
      if (musicData.timestamp && musicData.currentTime !== undefined) {
        audio.currentTime = calculateAdjustedTime(musicData.timestamp, musicData.currentTime);
      }

      // Attempt to play the audio
      await handlePlayAttempt(audio);

      // Update current sound state
      updateCurrentSound(musicData);

      startProgressTracking();
    },
    [volume, sounds, userInteracted, onAutoplayBlocked, calculateAdjustedTime, handlePlayAttempt, updateCurrentSound]
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
    setVolume,
    seekTo,
    setContext,
    playReceived,
    stopReceived,
    getCurrentTime,
    userInteracted,
    setUserInteracted,
  };
}
