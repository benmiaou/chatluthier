/**
 * Deezer Service
 *
 * Authentication: Deezer uses OAuth2 implicit grant. The access token is
 * returned in the URL fragment after the user authenticates on deezer.com.
 * Playback relies on the Deezer JS SDK (DZ) which is loaded via a script tag.
 *
 * The DZ SDK streams tracks in an invisible iframe — no additional CORS issues.
 */

const DEEZER_APP_ID = import.meta.env.VITE_DEEZER_APP_ID as string;
const STORAGE_KEY = 'deezer_token';

export interface DeezerToken {
  access_token: string;
  expires_at: number;
}

export interface DeezerSearchResult {
  trackId: string;
  title: string;
  artist: string;
  album: string;
  durationMs: number;
  thumbnailUrl: string;
  previewUrl: string;
  permalinkUrl: string;
  provider: 'deezer';
}

// ─── Token helpers ────────────────────────────────────────────────────────────

export function loadDeezerToken(): DeezerToken | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as DeezerToken) : null;
  } catch {
    return null;
  }
}

export function saveDeezerToken(token: DeezerToken): void {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(token));
}

export function clearDeezerToken(): void {
  sessionStorage.removeItem(STORAGE_KEY);
}

export function isDeezerTokenExpired(token: DeezerToken | null): boolean {
  if (!token) {
    return true;
  }
  return Date.now() >= token.expires_at - 60_000;
}

// ─── OAuth implicit grant ─────────────────────────────────────────────────────

export function getDeezerAuthUrl(redirectUri: string): string {
  const params = new URLSearchParams({
    app_id: DEEZER_APP_ID,
    redirect_uri: redirectUri,
    perms: 'basic_access,email,listening_history',
    response_type: 'token',
  });
  return `https://connect.deezer.com/oauth/auth.php?${params.toString()}`;
}

/** Parse the access token from the URL fragment after OAuth redirect */
export function parseDeezerCallback(hash: string): DeezerToken | null {
  const params = new URLSearchParams(hash.replace(/^#/, ''));
  const accessToken = params.get('access_token');
  const expiresIn = Number(params.get('expires'));

  if (!accessToken) {
    return null;
  }

  return {
    access_token: accessToken,
    expires_at: expiresIn > 0 ? Date.now() + expiresIn * 1000 : Date.now() + 3600 * 1000,
  };
}

// ─── Search ──────────────────────────────────────────────────────────────────

export async function deezerSearch(query: string, limit = 20): Promise<DeezerSearchResult[]> {
  const response = await fetch(`/api/deezer/search?q=${encodeURIComponent(query)}&limit=${limit}`);

  if (!response.ok) {
    throw new Error('Deezer search failed');
  }

  const data = await response.json();
  return data.results as DeezerSearchResult[];
}

// ─── SDK Playback (DZ global) ─────────────────────────────────────────────────

declare global {
  interface Window {
    DZ?: {
      init: (options: {
        appId: string;
        channelUrl: string;
        player?: { onload: () => void };
      }) => void;
      player: {
        playTracks: (ids: string[], startIndex?: number, offset?: number) => void;
        pause: () => void;
        play: () => void;
        setVolume: (v: number) => void;
        isPlaying: () => boolean;
      };
    };
  }
}

let sdkLoaded = false;
let sdkReady = false;
const readyCallbacks: Array<() => void> = [];

export function loadDeezerSdk(channelUrl: string): Promise<void> {
  if (sdkReady) {
    return Promise.resolve();
  }
  if (sdkLoaded) {
    return new Promise((resolve) => readyCallbacks.push(resolve));
  }

  sdkLoaded = true;

  return new Promise((resolve) => {
    readyCallbacks.push(resolve);

    const script = document.createElement('script');
    script.src = 'https://e-cdns-files.dzcdn.net/js/min/dz.js';
    script.async = true;
    script.onload = () => {
      window.DZ?.init({
        appId: DEEZER_APP_ID,
        channelUrl,
        player: {
          onload: () => {
            sdkReady = true;
            readyCallbacks.forEach((cb) => cb());
            readyCallbacks.length = 0;
          },
        },
      });
    };
    document.head.appendChild(script);
  });
}

export function deezerPlay(trackId: string): void {
  window.DZ?.player.playTracks([trackId]);
}

export function deezerPause(): void {
  window.DZ?.player.pause();
}

export function deezerResume(): void {
  window.DZ?.player.play();
}

export function deezerSetVolume(volume: number): void {
  // Deezer SDK volume is 0-100
  window.DZ?.player.setVolume(Math.round(volume * 100));
}
