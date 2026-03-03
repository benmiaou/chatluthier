import { useCallback, useEffect, useRef, useState } from 'react';
import type { Sound } from '../types/sound';

const ASSET_PREFIX = '/assets/ambiance/';

export interface AmbianceBar {
  sound: Sound;
  volume: number; // 0–1
  audio: HTMLAudioElement;
}

interface AmbianceSoundsHook {
  bars: AmbianceBar[];
  allBars: AmbianceBar[];
  presets: Record<string, Record<string, number>>;
  context: string;
  setContext: (context: string) => void;
  loadSounds: () => Promise<void>;
  setBarVolume: (filename: string, volume: number) => void;
  reset: () => void;
  getStatus: () => Record<string, number>;
  applyStatus: (status: Record<string, number>) => void;
  loadPresets: () => Promise<void>;
  savePreset: (name: string) => Promise<void>;
  deletePreset: (name: string) => Promise<void>;
  applyPreset: (name: string) => void;
}

export function useAmbianceSounds(userId: string | null): AmbianceSoundsHook {
  const [bars, setBars] = useState<AmbianceBar[]>([]);
  const [presets, setPresets] = useState<Record<string, Record<string, number>>>({});
  const [context, setContext] = useState('All');
  const barsRef = useRef<AmbianceBar[]>([]);

  // ─── Load sounds ──────────────────────────────────────────────────────────

  const loadSounds = useCallback(async () => {
    try {
      const main: Sound[] = await fetch('/ambianceSounds').then((r) => r.json());
      let userSounds: Sound[] = [];
      if (userId) {
        userSounds = await fetch(`/ambianceSounds?userId=${userId}`).then((r) => r.json());
      }
      const merged = main.map((s) => {
        const u = userSounds.find((us) => us.filename === s.filename);
        const base = u ? { ...s, ...u } : s;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return { ...base, name: base.name ?? (base as any).display_name ?? base.filename };
      });

      const newBars: AmbianceBar[] = merged
        .filter((s) => s.isEnabled !== false)
        .map((sound) => {
          const audio = new Audio(`${ASSET_PREFIX}${sound.filename}`);
          audio.loop = true;
          audio.volume = 0;
          return { sound, volume: 0, audio };
        });

      barsRef.current = newBars;
      setBars(newBars);
    } catch (_err) {
      // Failed to load ambiance sounds
    }
  }, [userId]);

  useEffect(() => {
    const load = async () => {
      await loadSounds();
    };
    load();
  }, [loadSounds]);

  // ─── Volume control ───────────────────────────────────────────────────────

  const updateBarAudio = useCallback((bar: AmbianceBar, volume: number) => {
    bar.audio.volume = volume;
    if (volume > 0 && bar.audio.paused) {
      bar.audio.play().catch(() => {});
    } else if (volume === 0) {
      bar.audio.pause();
    }
  }, []);

  const setBarVolume = useCallback((filename: string, volume: number) => {
    setBars((prev) => {
      const shouldUpdateBar = (bar: AmbianceBar) => bar.sound.filename === filename;
      return prev.map((b) => {
        if (!shouldUpdateBar(b)) {
          return b;
        }
        updateBarAudio(b, volume);
        return { ...b, volume };
      });
    });
  }, []);

  const reset = useCallback(() => {
    setBars((prev) =>
      prev.map((b) => {
        b.audio.pause();
        b.audio.volume = 0;
        return { ...b, volume: 0 };
      })
    );
  }, []);

  // ─── Get / apply status (for socket sync) ────────────────────────────────

  const getStatus = useCallback(() => {
    return Object.fromEntries(barsRef.current.map((b) => [b.sound.filename, b.volume]));
  }, []);

  const applyStatus = useCallback((status: Record<string, number>) => {
    setBars((prev) => {
      const getVolumeForBar = (bar: AmbianceBar) => status[bar.sound.filename] ?? 0;
      return prev.map((b) => {
        const vol = getVolumeForBar(b);
        updateBarAudio(b, vol);
        return { ...b, volume: vol };
      });
    });
  }, []);

  // Keep barsRef in sync
  useEffect(() => {
    barsRef.current = bars;
  }, [bars]);

  // ─── Presets ──────────────────────────────────────────────────────────────

  const loadPresets = useCallback(async () => {
    if (!userId) {
      return;
    }
    try {
      const data = await fetch(`/load-presets?userId=${userId}`).then((r) => r.json());
      setPresets(data?.presets ?? {});
    } catch {
      /* ignore */
    }
  }, [userId]);

  const savePreset = useCallback(
    async (name: string) => {
      if (!userId) {
        return;
      }
      const status = getStatus();
      setPresets((prev) => ({ ...prev, [name]: status }));
      await fetch('/save-preset', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, presetName: name, presetData: status }),
      });
    },
    [userId, getStatus]
  );

  const applyPreset = useCallback(
    (name: string) => {
      const preset = presets[name];
      if (preset) {
        applyStatus(preset);
      }
    },
    [presets, applyStatus]
  );

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      barsRef.current.forEach((b) => {
        b.audio.pause();
        b.audio.src = '';
      });
    };
  }, []);

  return {
    bars:
      context === 'All' ? bars : bars.filter((b) => b.sound.contexts?.includes(context) ?? false),
    allBars: bars,
    presets,
    context,
    setContext,
    loadSounds,
    setBarVolume,
    reset,
    getStatus,
    applyStatus,
    loadPresets,
    savePreset,
    applyPreset,
  };
}
