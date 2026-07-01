import { useCallback, useEffect, useRef, useState } from 'react';
import { AudioPlayer, precacheAudio } from './useAudioPlayer';
import type { Sound } from '../types/sound';
import { BackgroundMusicCategories, bgMatchesCategoryAndContext } from '../types/sound';
import { handleError } from '../utils/logger';

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
  setUserInteracted: (interacted: boolean) => void;
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
  }) => Promise<void>;
  stopReceived: () => void;
  setOnTrackEnded: (callback: (() => void) | null) => void;
}

export function useBackgroundMusic(
  userId: string | null,
  onAutoplayBlocked?: () => void,
  onTrackEnded?: () => void,
  sessionId?: string | null
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
  const [_audioInitialized, _setAudioInitialized] = useState(false);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentCategoryRef = useRef<BackgroundMusicCategory | null>(null);
  const onTrackEndedRef = useRef(onTrackEnded);
  const sessionIdRef = useRef(sessionId);

  useEffect(() => {
    onTrackEndedRef.current = onTrackEnded;
  }, [onTrackEnded]);

  useEffect(() => {
    sessionIdRef.current = sessionId;
  }, [sessionId]);

  // Initialize audio element
  useEffect(() => {
    const audio = playerRef.current.getElement();
    audio.onerror = () => {};
    return () => {
      audio.onended = null;
      audio.onerror = null;
    };
  }, []);

  // Load sounds
  const loadSounds = useCallback(async () => {
    try {
      const main: Sound[] = await fetch('/backgroundMusic').then((r) => r.json());
      let userSounds: Sound[] = [];
      if (userId) {
        userSounds = await fetch(`/backgroundMusic?userId=${userId}`).then((r) => r.json());
      }

      const merged = main
        .map((s) => {
          const u = userSounds.find((us) => us.filename === s.filename);
          const base = u ? { ...s, ...u } : s;
          return { ...base, name: base.name ?? base.display_name ?? base.filename };
        })
        .filter((s) => s.isEnabled !== false);

      setSounds(merged);
      precacheAudio(merged.filter((s) => s.filename).map((s) => `${ASSET_PREFIX}${s.filename}`));
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

  useEffect(() => {
    const handler = () => {
      loadSounds().catch(() => {});
    };
    window.addEventListener('soundsUpdated', handler);
    return () => window.removeEventListener('soundsUpdated', handler);
  }, [loadSounds]);

  // Progress bar
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

  // Play a specific sound
  const playSpecificSoundRef = useRef<(sound: Sound, startTime?: number) => Promise<void>>(null);

  const playSpecificSound = useCallback(
    async (sound: Sound, _startTime = 0) => {
      setCurrentSound(sound);

      const categories: BackgroundMusicCategory[] = [
        BackgroundMusicCategories.CALM,
        BackgroundMusicCategories.DYNAMIC,
        BackgroundMusicCategories.INTENSE,
        BackgroundMusicCategories.ALL,
      ];
      const soundCategory = categories.find((category) =>
        bgMatchesCategoryAndContext(sound, category, 'all')
      );

      if (soundCategory) {
        setActiveCategory(soundCategory);
        currentCategoryRef.current = soundCategory;
      }

      try {
        await playerRef.current.play(`${ASSET_PREFIX}${sound.filename}`, volume, () => {
          const originalCategory = currentCategoryRef.current;

          if (originalCategory && !sessionIdRef.current) {
            setTimeout(() => {
              const filtered = sounds.filter((s) =>
                bgMatchesCategoryAndContext(s, originalCategory, context)
              );

              if (filtered.length > 0) {
                const currentIndex = filtered.findIndex((s) => s.filename === sound.filename);

                if (currentIndex >= 0) {
                  const nextIndex = (currentIndex + 1) % filtered.length;
                  const nextSound = filtered[nextIndex];
                  playSpecificSoundRef.current?.(nextSound).catch(() => {});
                } else {
                  playSpecificSoundRef.current?.(filtered[0]).catch(() => {});
                }
              }
            }, 0);
          } else if (sessionIdRef.current) {
            // In sessions, the server will handle broadcasting the next track
          }

          if (onTrackEndedRef.current) {
            onTrackEndedRef.current();
          }
        });

        setIsPlaying(true);
        startProgressTracking();
      } catch (error) {
        handleError(error, 'useBackgroundMusic.playSpecificSound', undefined, {
          soundFilename: sound.filename,
          activeCategory,
          currentTime: playerRef.current.getElement().currentTime,
        });
        setIsPlaying(false);
        throw error;
      }
    },
    [volume, sounds, activeCategory, context]
  );

  useEffect(() => {
    playSpecificSoundRef.current = playSpecificSound;
  }, [playSpecificSound]);

  // Play a category
  const playCategory = useCallback(
    async (category: BackgroundMusicCategory) => {
      const filtered = sounds.filter((s) => bgMatchesCategoryAndContext(s, category, context));
      if (!filtered.length) {
        return;
      }
      const pick = filtered[Math.floor(Math.random() * filtered.length)];
      setCurrentSound(pick);

      const currentSoundForHandler = pick;
      currentCategoryRef.current = category;
      setActiveCategory(category);

      await playerRef.current.play(`${ASSET_PREFIX}${pick.filename}`, volume, () => {
        const originalCategory = currentCategoryRef.current;

        if (originalCategory === category) {
          setTimeout(() => {
            const filteredSounds = sounds.filter((s) =>
              bgMatchesCategoryAndContext(s, category, context)
            );

            if (filteredSounds.length > 0) {
              const currentIndex = filteredSounds.findIndex(
                (s) => s.filename === currentSoundForHandler.filename
              );

              if (currentIndex >= 0) {
                const nextIndex = (currentIndex + 1) % filteredSounds.length;
                const nextSound = filteredSounds[nextIndex];
                setActiveCategory(originalCategory);
                playSpecificSoundRef.current?.(nextSound).catch(() => {});
              } else {
                setActiveCategory(originalCategory);
                playSpecificSoundRef.current?.(filteredSounds[0]).catch(() => {});
              }
            }
          }, 0);
        }
      });

      setIsPlaying(true);
      startProgressTracking();
    },
    [sounds, volume, context, playSpecificSoundRef]
  );

  const next = useCallback(() => {
    if (!activeCategory) {
      return;
    }
    const filteredSounds = sounds.filter((s) =>
      bgMatchesCategoryAndContext(s, activeCategory, context)
    );
    if (!filteredSounds.length) {
      return;
    }
    const currentIndex = filteredSounds.findIndex((s) => s.filename === currentSound?.filename);
    const nextIndex = (currentIndex + 1) % filteredSounds.length;
    playSpecificSoundRef.current?.(filteredSounds[nextIndex]).catch(() => {});
  }, [activeCategory, sounds, context, currentSound?.filename, playSpecificSoundRef]);

  const stop = useCallback(() => {
    playerRef.current.stop();
    setIsPlaying(false);
    setCurrentSound(null);
    stopProgressTracking();
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

  // Remote playback (received via socket)
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

      if (musicData.timestamp && musicData.currentTime !== undefined) {
        audio.currentTime = calculateAdjustedTime(musicData.timestamp, musicData.currentTime);
      }

      await handlePlayAttempt(audio);
      updateCurrentSound(musicData);
      startProgressTracking();
    },
    [volume, calculateAdjustedTime, handlePlayAttempt, updateCurrentSound]
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
    stopReceived,
    getCurrentTime,
    userInteracted,
    setUserInteracted,
    setOnTrackEnded: (callback: (() => void) | null) => {
      onTrackEndedRef.current = callback;
    },
  };
}
