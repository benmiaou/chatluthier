import { useCallback, useRef } from 'react';

const CACHE_NAME = 'audio-cache-v1';

export class AudioPlayer {
  private audio: HTMLAudioElement;

  constructor() {
    this.audio = new Audio();
  }

  async play(url: string, volume = 1): Promise<void> {
    this.audio.src = url;
    this.audio.volume = Math.max(0, Math.min(1, volume));
    await this.audio.play();
  }

  stop(): void {
    this.audio.pause();
    this.audio.currentTime = 0;
  }

  pause(): void {
    this.audio.pause();
  }

  setVolume(volume: number): void {
    this.audio.volume = Math.max(0, Math.min(1, volume));
  }

  getElement(): HTMLAudioElement {
    return this.audio;
  }

  get currentTime(): number {
    return this.audio.currentTime;
  }

  set currentTime(value: number) {
    this.audio.currentTime = value;
  }

  get duration(): number {
    return this.audio.duration || 0;
  }
}

export function useAudioPlayer() {
  const playerRef = useRef<AudioPlayer>(new AudioPlayer());

  const play = useCallback(async (url: string, volume?: number) => {
    await playerRef.current.play(url, volume);
  }, []);

  const stop = useCallback(() => {
    playerRef.current.stop();
  }, []);

  const setVolume = useCallback((volume: number) => {
    playerRef.current.setVolume(volume);
  }, []);

  return { player: playerRef.current, play, stop, setVolume };
}

/** Pre-cache a list of audio URLs using the Cache API */
export async function precacheAudio(urls: string[]): Promise<void> {
  if (!('caches' in window)) return;
  try {
    const cache = await caches.open(CACHE_NAME);
    await Promise.allSettled(urls.map((url) => cache.add(url)));
  } catch {
    /* ignore caching errors */
  }
}
