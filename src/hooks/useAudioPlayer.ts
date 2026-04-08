import { useCallback, useRef } from 'react';
import type { RefObject } from 'react';

const CACHE_NAME = 'audio-cache-v1';

// Declare Sentry for error reporting
declare const Sentry:
  | {
      captureException: (error: unknown, options?: { contexts?: Record<string, unknown> }) => void;
    }
  | undefined;

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
    // Check if we're trying to play the same URL that's already playing
    // But only skip if it's actually playing (not ended)
    if (
      this.audio.src === url &&
      !this.audio.paused &&
      !this.audio.ended &&
      this.audio.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA
    ) {
      // Only update volume if different
      if (Math.abs(this.audio.volume - volume) > 0.01) {
        this.audio.volume = Math.max(0, Math.min(1, volume));
      }
      return;
    }

    // If we're trying to play the same URL but it has ended, we need to restart it
    if (this.audio.src === url && this.audio.ended) {
      this.audio.currentTime = 0;
    }

    // Clear any existing event handlers to avoid conflicts
    this.audio.onended = null;
    this.audio.onerror = null;

    // If we're switching to a different URL, make sure to reset the audio element
    if (this.audio.src !== url) {
      this.audio.src = url;
      this.audio.currentTime = 0;
    }

    this.audio.volume = Math.max(0, Math.min(1, volume));

    // Set up onended handler if provided
    if (onEnded) {
      this.audio.onended = onEnded;
    }

    try {
      // If startTime is specified, we need to handle it carefully
      if (startTime > 0) {
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
      // Check if audio is actually playing
      if (this.audio.paused) {
        // console.warn('[AudioPlayer] WARNING: Audio element is still paused after play() call');
      }

      // Double-check seeking after play starts (some browsers need this)
      if (startTime > 0 && Math.abs(this.audio.currentTime - startTime) > 0.1) {
        this.audio.currentTime = startTime;
      }
    } catch (error) {
      // console.error('[AudioPlayer] Error during playback:', error);
      // Don't throw error for abort errors to prevent cascading failures
      if (error instanceof Error && error.name === 'AbortError') {
        // console.log('[AudioPlayer] Playback aborted');
        // Playback was aborted (likely by a new play request)
      } else {
        // For other errors, log to Sentry if available
        if (typeof Sentry !== 'undefined' && Sentry.captureException) {
          try {
            Sentry.captureException(error, {
              contexts: {
                audioPlayer: {
                  url,
                  volume,
                  startTime,
                  currentTime: this.audio.currentTime,
                  readyState: this.audio.readyState,
                },
              },
            });
          } catch (_sentryError) {
            // Failed to capture audio error in Sentry
          }
        }
        throw error;
      }
    }
  }

  stop(): void {
    this.audio.pause();
    this.audio.currentTime = 0;

    // Clear any existing event handlers to avoid conflicts
    this.audio.onended = null;
    this.audio.onerror = null;
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
