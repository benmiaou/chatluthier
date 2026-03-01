import { useCallback, useEffect, useState } from 'react';
import type { Sound } from '../types/sound';

const ASSET_PREFIX = '/assets/soundboard/';

export function useSoundboard(userId: string | null) {
  const [sounds, setSounds] = useState<Sound[]>([]);
  const [volume, setVolumeState] = useState(0.5);
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
      console.error('Failed to load soundboard:', err);
    }
  }, [userId]);

  useEffect(() => {
    loadSounds();
  }, [loadSounds]);

  const playSound = useCallback(
    (filename: string): HTMLAudioElement => {
      const audio = new Audio(`${ASSET_PREFIX}${filename}`);
      audio.volume = volume;
      audio.play().catch(() => {});
      return audio;
    },
    [volume]
  );

  const setVolume = useCallback((v: number) => {
    setVolumeState(v);
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
    setVolume,
  };
}

export interface Sound {
  filename: string;
  name: string;
  credit?: string;
  contexts?: string[];
  // ...other properties if they exist...
}
