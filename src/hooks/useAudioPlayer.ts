import { useCallback, useRef } from 'react';
import type { RefObject } from 'react';

const CACHE_NAME = 'audio-cache-v1';

interface AudioPlayerHook {
  player: RefObject<AudioPlayer>;
  play: (url: string, volume?: number) => Promise<void>;
  stop: () => void;
  setVolume: (volume: number) => void;
}

export class AudioPlayer {
  private readonly audio: HTMLAudioElement;

  constructor() {
    this.audio = new Audio();
  }

  async play(url: string, volume = 1, onEnded?: () => void, startTime = 0): Promise<void> {
    console.log(`[AudioPlayer] Playing: ${url}`, {
      volume: volume,
      hasOnEnded: !!onEnded,
      currentTime: this.audio.currentTime,
      paused: this.audio.paused,
      startTime: startTime
    });
    
    this.audio.src = url;
    this.audio.volume = Math.max(0, Math.min(1, volume));
    
    // Set up onended handler if provided
    if (onEnded) {
      console.log('[AudioPlayer] Setting onended handler');
      this.audio.onended = onEnded;
    } else {
      console.log('[AudioPlayer] No onended handler provided');
    }
    
    try {
      // If startTime is specified, we need to handle it carefully
      if (startTime > 0) {
        console.log(`[AudioPlayer] Seeking to: ${startTime} before playing`);
        
        // Wait for metadata to be loaded before seeking
        if (this.audio.readyState < HTMLMediaElement.HAVE_METADATA) {
          await new Promise((resolve) => {
            this.audio.addEventListener('loadedmetadata', resolve, { once: true });
            // Add timeout as fallback
            setTimeout(resolve, 2000);
          });
        }
        
        this.audio.currentTime = startTime;
      }
      
      await this.audio.play();
      console.log(`[AudioPlayer] Successfully started playback of: ${url}`);
      
      // Double-check seeking after play starts (some browsers need this)
      if (startTime > 0 && Math.abs(this.audio.currentTime - startTime) > 0.1) {
        console.log(`[AudioPlayer] Correcting position to: ${startTime}`);
        this.audio.currentTime = startTime;
      }
    } catch (error) {
      console.error('[AudioPlayer] Playback failed:', error);
      throw error;
    }
  }

  stop(): void {
    console.log('[AudioPlayer] Stopping playback', {
      currentTime: this.audio.currentTime,
      paused: this.audio.paused,
      src: this.audio.src
    });
    
    this.audio.pause();
    this.audio.currentTime = 0;
    
    // Clear any existing event handlers to avoid conflicts
    console.log('[AudioPlayer] Clearing event handlers');
    this.audio.onended = null;
    this.audio.onerror = null;
    
    console.log('[AudioPlayer] Stopped playback');
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

export function useAudioPlayer(): AudioPlayerHook {
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

  return { player: playerRef, play, stop, setVolume };
}

/** Pre-cache a list of audio URLs using the Cache API */
export async function precacheAudio(urls: string[]): Promise<void> {
  if (!('caches' in globalThis)) {
    return;
  }
  try {
    const cache = await caches.open(CACHE_NAME);
    await Promise.allSettled(urls.map((url) => cache.add(url)));
  } catch {
    /* ignore caching errors */
  }
}
