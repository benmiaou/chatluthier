import { useCallback, useEffect, useState } from 'react';
import type { Sound } from '../types/sound';
import { handleError } from '../utils/logger';

const ASSET_PREFIX = '/assets/soundboard/';

export function useSoundboard(userId: string | null): {
  sounds: Sound[];
  allSounds: Sound[];
  volume: number;
  setVolume: (volume: number) => void;
  context: string;
  setContext: (context: string) => void;
  loadSounds: () => Promise<void>;
  playSound: (sound: Sound) => void;
  stopAll: () => void;
  getStatus: () => Record<string, boolean>;
  applyStatus: (status: Record<string, boolean>) => void;
} {
  const [sounds, setSounds] = useState<Sound[]>([]);
  const [volume, setVolume] = useState(0.5);
  const [context, setContext] = useState('All');

  const loadSounds = useCallback(async () => {
    try {
      const main: Sound[] = await fetch('/soundboard').then((r) => r.json());
      let userSounds: Sound[] = [];
      if (userId) {
        userSounds = await fetch(`/soundboard?userId=${userId}`).then((r) => r.json());
      }
      const merged = main.map((s) => {
        const u = userSounds.find((us) => us.filename === s.filename);
        const base = u ? { ...s, ...u } : s;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return { ...base, name: base.name ?? (base as any).display_name ?? base.filename };
      });
      setSounds(merged.filter((s) => s.isEnabled !== false));
    } catch (err) {
      handleError(err, 'useSoundboard.loadSounds');
    }
  }, [userId]);

  useEffect(() => {
    const load = async () => {
      await loadSounds();
    };
    load();
  }, [loadSounds]);

  const playSound = useCallback(
    (sound: Sound): void => {
      const audio = new Audio(`${ASSET_PREFIX}${sound.filename}`);
      audio.volume = volume;
      audio.play().catch(() => {});
    },
    [volume]
  );

  const handleSetVolume = useCallback((v: number) => {
    setVolume(v);
  }, []);

  const stopAll = useCallback(() => {
    // Implementation for stopping all sounds
    // You might need to track active audio elements to stop them
  }, []);

  const getStatus = useCallback((): Record<string, boolean> => {
    // Implementation for getting sound statuses
    return {};
  }, []);

  const applyStatus = useCallback((_status: Record<string, boolean>) => {
    // Implementation for applying sound statuses
  }, []);

  return {
    sounds:
      context === 'All' ? sounds : sounds.filter((s) => s.contexts?.includes(context) ?? false),
    allSounds: sounds,
    volume,
    context,
    setContext,
    loadSounds,
    playSound,
    setVolume: handleSetVolume,
    stopAll,
    getStatus,
    applyStatus,
  };
}
