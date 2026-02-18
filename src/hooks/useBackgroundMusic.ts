import { useCallback, useEffect, useRef, useState } from 'react';
import { AudioPlayer, precacheAudio } from './useAudioPlayer';
import type { Sound, BackgroundMusicCategory } from '../types/sound';

const ASSET_PREFIX = '/assets/background/';

export function useBackgroundMusic(userId: string | null) {
  const playerRef = useRef<AudioPlayer>(new AudioPlayer());
  const [sounds, setSounds] = useState<Sound[]>([]);
  const [currentSound, setCurrentSound] = useState<Sound | null>(null);
  const [activeCategory, setActiveCategory] = useState<BackgroundMusicCategory | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolumeState] = useState(0.5);
  const [progress, setProgress] = useState(0); // 0–100
  const [context, setContextState] = useState('All');
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
    } catch (err) {
      console.error('Failed to load background sounds:', err);
    }
  }, [userId]);

  useEffect(() => {
    loadSounds();
  }, [loadSounds]);

  // ─── Progress bar ─────────────────────────────────────────────────────────

  const startProgressTracking = () => {
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    progressIntervalRef.current = setInterval(() => {
      const el = playerRef.current.getElement();
      if (el.duration) setProgress((el.currentTime / el.duration) * 100);
    }, 500);
  };

  const stopProgressTracking = () => {
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    progressIntervalRef.current = null;
    setProgress(0);
  };

  // ─── Play a category ──────────────────────────────────────────────────────

  const playCategory = useCallback(
    async (category: BackgroundMusicCategory) => {
      const filtered = sounds.filter(
        (s) =>
          (category === 'all' || s.category === category) &&
          (context === 'All' || s.contexts?.includes(context)),
      );
      if (!filtered.length) return;
      const pick = filtered[Math.floor(Math.random() * filtered.length)];
      setCurrentSound(pick);
      setActiveCategory(category);

      const audio = playerRef.current.getElement();
      audio.src = `${ASSET_PREFIX}${pick.filename}`;
      audio.volume = volume;
      audio.onended = () => playCategory(category); // auto-advance
      await audio.play();
      setIsPlaying(true);
      startProgressTracking();
    },
    [sounds, volume, context],
  );

  const next = useCallback(() => {
    if (activeCategory) playCategory(activeCategory);
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
    if (el.duration) el.currentTime = (pct / 100) * el.duration;
  }, []);

  const setContext = useCallback((ctx: string) => {
    setContextState(ctx);
  }, []);

  // ─── Remote playback (received via socket) ────────────────────────────────

  const playReceived = useCallback(
    async (musicData: { filename: string; credit?: string }) => {
      const audio = playerRef.current.getElement();
      audio.src = `${ASSET_PREFIX}${musicData.filename}`;
      audio.volume = volume;
      await audio.play();
      setIsPlaying(true);
      startProgressTracking();
    },
    [volume],
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
    next,
    stop,
    setVolume,
    seekTo,
    setContext,
    playReceived,
    stopReceived,
  };
}
