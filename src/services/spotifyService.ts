import type { SpotifyToken } from '../types/spotify';
import { apiFetch } from './api';

const CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID as string;
const REDIRECT_URI =
  window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? (import.meta.env.VITE_SPOTIFY_REDIRECT_URI_LOCAL as string)
    : (import.meta.env.VITE_SPOTIFY_REDIRECT_URI_PROD as string);

const SCOPES = [
  'user-read-playback-state',
  'user-modify-playback-state',
  'user-read-currently-playing',
  'playlist-read-private',
  'streaming',
].join(' ');

const STORAGE_KEY = 'spotify_token';

// ─── PKCE helpers ────────────────────────────────────────────────────────────

async function generateCodeVerifier(): Promise<string> {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const data = new TextEncoder().encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

// ─── Auth URL ────────────────────────────────────────────────────────────────

export async function getSpotifyAuthUrl(): Promise<string> {
  const verifier = await generateCodeVerifier();
  const challenge = await generateCodeChallenge(verifier);
  sessionStorage.setItem('spotify_code_verifier', verifier);

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: 'code',
    redirect_uri: REDIRECT_URI,
    scope: SCOPES,
    code_challenge_method: 'S256',
    code_challenge: challenge,
  });
  return `https://accounts.spotify.com/authorize?${params.toString()}`;
}

// ─── Token exchange ──────────────────────────────────────────────────────────

export async function exchangeSpotifyCode(code: string): Promise<SpotifyToken> {
  const verifier = sessionStorage.getItem('spotify_code_verifier');
  if (!verifier) throw new Error('No code verifier found');

  const token = await apiFetch<SpotifyToken>('/api/spotify/token', {
    method: 'POST',
    body: JSON.stringify({ code, code_verifier: verifier, redirect_uri: REDIRECT_URI }),
  });

  sessionStorage.removeItem('spotify_code_verifier');
  saveToken(token);
  return token;
}

// ─── Token refresh ───────────────────────────────────────────────────────────

export async function refreshSpotifyToken(refreshToken: string): Promise<SpotifyToken> {
  const token = await apiFetch<SpotifyToken>('/api/spotify/refresh', {
    method: 'POST',
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  saveToken(token);
  return token;
}

// ─── Storage helpers ─────────────────────────────────────────────────────────

export function saveToken(token: SpotifyToken): void {
  const withExpiry: SpotifyToken = {
    ...token,
    expires_at: Date.now() + token.expires_in * 1000,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(withExpiry));
}

export function loadToken(): SpotifyToken | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  return JSON.parse(raw) as SpotifyToken;
}

export function clearToken(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function isTokenExpired(token: SpotifyToken): boolean {
  return !token.expires_at || Date.now() > token.expires_at - 60_000;
}

// ─── Playback API calls ──────────────────────────────────────────────────────

async function spotifyApi(
  path: string,
  accessToken: string,
  options?: RequestInit
): Promise<Response> {
  return fetch(`https://api.spotify.com/v1${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
}

export async function spotifyPlay(accessToken: string, contextUri?: string): Promise<void> {
  await spotifyApi('/me/player/play', accessToken, {
    method: 'PUT',
    body: contextUri ? JSON.stringify({ context_uri: contextUri }) : undefined,
  });
}

export async function spotifyPause(accessToken: string): Promise<void> {
  await spotifyApi('/me/player/pause', accessToken, { method: 'PUT' });
}

export async function spotifyNext(accessToken: string): Promise<void> {
  await spotifyApi('/me/player/next', accessToken, { method: 'POST' });
}

export async function spotifySetVolume(accessToken: string, volumePercent: number): Promise<void> {
  await spotifyApi(`/me/player/volume?volume_percent=${Math.round(volumePercent)}`, accessToken, {
    method: 'PUT',
  });
}

export async function spotifyGetPlaybackState(accessToken: string) {
  const res = await spotifyApi('/me/player', accessToken);
  if (!res.ok) return null;
  return res.json();
}

export async function spotifyGetPlaylists(accessToken: string) {
  const res = await spotifyApi('/me/playlists?limit=50', accessToken);
  if (!res.ok) return [];
  const data = await res.json();
  return data.items ?? [];
}
