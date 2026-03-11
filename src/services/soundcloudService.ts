/**
 * SoundCloud Service
 *
 * Authentication: OAuth2 authorization code + PKCE via /api/soundcloud/token.
 * Playback: SoundCloud Widget API — embeds a hidden iframe and controls it.
 *
 * Requires env var: VITE_SOUNDCLOUD_CLIENT_ID, VITE_SOUNDCLOUD_REDIRECT_URI_LOCAL,
 *                   VITE_SOUNDCLOUD_REDIRECT_URI_PROD
 */

const SOUNDCLOUD_CLIENT_ID = import.meta.env.VITE_SOUNDCLOUD_CLIENT_ID as string;
const REDIRECT_URI =
  globalThis.location.hostname === 'localhost' || globalThis.location.hostname === '127.0.0.1'
    ? (import.meta.env.VITE_SOUNDCLOUD_REDIRECT_URI_LOCAL as string)
    : (import.meta.env.VITE_SOUNDCLOUD_REDIRECT_URI_PROD as string);

const STORAGE_KEY = 'soundcloud_token';

export interface SoundCloudToken {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  expires_at: number;
}

export interface SoundCloudSearchResult {
  trackId: string;
  title: string;
  artist: string;
  album: string;
  durationMs: number;
  thumbnailUrl: string;
  previewUrl: string;
  permalinkUrl: string;
  provider: 'soundcloud';
}

// ─── PKCE helpers ─────────────────────────────────────────────────────────────

async function generateCodeVerifier(): Promise<string> {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return btoa(String.fromCodePoint(...array))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const data = new TextEncoder().encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCodePoint(...new Uint8Array(digest)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

// ─── Token helpers ────────────────────────────────────────────────────────────

export function loadSoundCloudToken(): SoundCloudToken | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SoundCloudToken) : null;
  } catch {
    return null;
  }
}

export function saveSoundCloudToken(token: SoundCloudToken): void {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(token));
}

export function clearSoundCloudToken(): void {
  sessionStorage.removeItem(STORAGE_KEY);
}

export function isSoundCloudTokenExpired(token: SoundCloudToken | null): boolean {
  if (!token) {
    return true;
  }
  return Date.now() >= token.expires_at - 60_000;
}

// ─── Auth URL (PKCE) ──────────────────────────────────────────────────────────

export async function getSoundCloudAuthUrl(): Promise<string> {
  const verifier = await generateCodeVerifier();
  const challenge = await generateCodeChallenge(verifier);
  sessionStorage.setItem('soundcloud_code_verifier', verifier);

  const params = new URLSearchParams({
    client_id: SOUNDCLOUD_CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    code_challenge: challenge,
    code_challenge_method: 'S256',
  });

  return `https://secure.soundcloud.com/authorize?${params.toString()}`;
}

// ─── Token exchange ───────────────────────────────────────────────────────────

export async function exchangeSoundCloudCode(code: string): Promise<SoundCloudToken> {
  const verifier = sessionStorage.getItem('soundcloud_code_verifier') ?? '';

  const response = await fetch('/api/soundcloud/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, code_verifier: verifier, redirect_uri: REDIRECT_URI }),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || 'SoundCloud token exchange failed');
  }

  const data = await response.json();
  const token: SoundCloudToken = {
    ...data,
    expires_at: Date.now() + data.expires_in * 1000,
  };
  saveSoundCloudToken(token);
  sessionStorage.removeItem('soundcloud_code_verifier');
  return token;
}

export async function refreshSoundCloudToken(refreshToken: string): Promise<SoundCloudToken> {
  const response = await fetch('/api/soundcloud/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });

  if (!response.ok) {
    throw new Error('SoundCloud token refresh failed');
  }

  const data = await response.json();
  const token: SoundCloudToken = {
    ...data,
    expires_at: Date.now() + data.expires_in * 1000,
  };
  saveSoundCloudToken(token);
  return token;
}

// ─── Search ──────────────────────────────────────────────────────────────────

export async function soundCloudSearch(
  query: string,
  accessToken: string | null,
  limit = 20
): Promise<SoundCloudSearchResult[]> {
  const headers: Record<string, string> = {};
  if (accessToken) {
    headers.Authorization = `OAuth ${accessToken}`;
  }

  const response = await fetch(
    `/api/soundcloud/search?q=${encodeURIComponent(query)}&limit=${limit}`,
    { headers }
  );

  if (!response.ok) {
    throw new Error('SoundCloud search failed');
  }

  const data = await response.json();
  return data.results as SoundCloudSearchResult[];
}

// ─── Widget API playback ──────────────────────────────────────────────────────

declare global {
  interface Window {
    SC?: {
      Widget: (iframe: HTMLIFrameElement) => SoundCloudWidget;
    };
  }
}

interface SoundCloudWidget {
  load: (url: string, options?: { auto_play?: boolean; show_artwork?: boolean }) => void;
  play: () => void;
  pause: () => void;
  setVolume: (v: number) => void;
  bind: (event: string, listener: () => void) => void;
}

let widgetIframe: HTMLIFrameElement | null = null;
let widget: SoundCloudWidget | null = null;
let sdkLoaded = false;

export function loadSoundCloudWidget(): Promise<SoundCloudWidget> {
  if (widget) {
    return Promise.resolve(widget);
  }

  return new Promise((resolve) => {
    const init = () => {
      if (!widgetIframe) {
        widgetIframe = document.createElement('iframe');
        widgetIframe.id = 'sc-widget';
        widgetIframe.src = 'https://w.soundcloud.com/player/?url=https%3A//soundcloud.com';
        widgetIframe.style.cssText =
          'width:0;height:0;border:none;position:absolute;visibility:hidden;';
        document.body.appendChild(widgetIframe);
      }

      widget = window.SC?.Widget(widgetIframe) ?? null;
      if (widget) {
        resolve(widget);
      }
    };

    if (window.SC) {
      init();
      return;
    }

    if (!sdkLoaded) {
      sdkLoaded = true;
      const script = document.createElement('script');
      script.src = 'https://w.soundcloud.com/player/api.js';
      script.async = true;
      script.onload = init;
      document.head.appendChild(script);
    }
  });
}

export async function soundCloudPlay(permalinkUrl: string): Promise<void> {
  const w = await loadSoundCloudWidget();
  w.load(permalinkUrl, { auto_play: true, show_artwork: false });
}

export async function soundCloudPause(): Promise<void> {
  const w = await loadSoundCloudWidget();
  w.pause();
}

export async function soundCloudResume(): Promise<void> {
  const w = await loadSoundCloudWidget();
  w.play();
}

export async function soundCloudSetVolume(volume: number): Promise<void> {
  const w = await loadSoundCloudWidget();
  w.setVolume(Math.round(volume * 100));
}
