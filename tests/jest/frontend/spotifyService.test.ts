/**
 * Unit tests for spotifyService.ts
 *
 * Covers: token helpers, expiry check, PKCE auth URL generation,
 * and the spotifySearch function with mocked fetch.
 */

import type { SpotifyToken } from '../../../src/types/spotify';
import {
  saveToken,
  loadToken,
  clearToken,
  isTokenExpired,
  getSpotifyAuthUrl,
  spotifySearch,
  type SpotifySearchResult,
} from '../../../src/services/spotifyService';

// ─── isTokenExpired ───────────────────────────────────────────────────────────

describe('isTokenExpired', () => {
  const base: SpotifyToken = {
    access_token: 'tok',
    token_type: 'Bearer',
    expires_in: 3600,
    scope: 'streaming',
  };

  it('returns true when expires_at is in the past', () => {
    const token = { ...base, expires_at: Date.now() - 1000 };
    expect(isTokenExpired(token)).toBe(true);
  });

  it('returns true within the 60s buffer window', () => {
    const token = { ...base, expires_at: Date.now() + 30_000 };
    expect(isTokenExpired(token)).toBe(true);
  });

  it('returns false when expires_at is far in the future', () => {
    const token = { ...base, expires_at: Date.now() + 3600_000 };
    expect(isTokenExpired(token)).toBe(false);
  });

  it('returns true when expires_at is undefined', () => {
    expect(isTokenExpired(base)).toBe(true);
  });
});

// ─── Token storage ────────────────────────────────────────────────────────────

describe('Spotify token storage', () => {
  beforeEach(() => sessionStorage.clear());

  const token: SpotifyToken = {
    access_token: 'sp-access-token',
    token_type: 'Bearer',
    expires_in: 3600,
    refresh_token: 'sp-refresh',
    scope: 'streaming',
    expires_at: Date.now() + 3600_000,
  };

  it('loadToken returns null when nothing stored', () => {
    expect(loadToken()).toBeNull();
  });

  it('saveToken and loadToken round-trip', () => {
    saveToken(token);
    const loaded = loadToken();
    expect(loaded?.access_token).toBe('sp-access-token');
  });

  it('saveToken adds expires_at if missing', () => {
    const noExpiry: SpotifyToken = { ...token, expires_at: undefined };
    saveToken(noExpiry);
    const loaded = loadToken();
    expect(loaded?.expires_at).toBeGreaterThan(Date.now());
  });

  it('clearToken removes the token', () => {
    saveToken(token);
    clearToken();
    expect(loadToken()).toBeNull();
  });
});

// ─── getSpotifyAuthUrl ────────────────────────────────────────────────────────

describe('getSpotifyAuthUrl', () => {
  beforeEach(() => sessionStorage.clear());

  it('returns a URL pointing to Spotify accounts endpoint', async () => {
    const url = await getSpotifyAuthUrl();
    expect(url).toContain('accounts.spotify.com/authorize');
  });

  it('uses PKCE: includes code_challenge and code_challenge_method=S256', async () => {
    const url = await getSpotifyAuthUrl();
    expect(url).toContain('code_challenge=');
    expect(url).toContain('code_challenge_method=S256');
  });

  it('uses response_type=code (authorization code flow)', async () => {
    const url = await getSpotifyAuthUrl();
    expect(url).toContain('response_type=code');
  });

  it('stores code_verifier in sessionStorage', async () => {
    await getSpotifyAuthUrl();
    expect(sessionStorage.getItem('spotify_code_verifier')).not.toBeNull();
  });

  it('generates a different code_verifier each call', async () => {
    await getSpotifyAuthUrl();
    const v1 = sessionStorage.getItem('spotify_code_verifier');
    await getSpotifyAuthUrl();
    const v2 = sessionStorage.getItem('spotify_code_verifier');
    expect(v1).not.toBe(v2);
  });

  it('includes required streaming scopes', async () => {
    const url = await getSpotifyAuthUrl();
    expect(decodeURIComponent(url)).toContain('streaming');
    expect(decodeURIComponent(url)).toContain('user-read-playback-state');
  });
});

// ─── spotifySearch ────────────────────────────────────────────────────────────

describe('spotifySearch', () => {
  beforeEach(() => (globalThis.fetch as jest.Mock).mockReset());

  const mockResults: SpotifySearchResult[] = [
    {
      trackId: 'sp-1',
      title: 'Get Lucky',
      artist: 'Daft Punk',
      album: 'Random Access Memories',
      durationMs: 369626,
      thumbnailUrl: 'https://example.com/ram.jpg',
      previewUrl: null,
      provider: 'spotify',
    },
  ];

  it('calls the proxy search endpoint', async () => {
    (globalThis.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ results: mockResults }),
    });

    await spotifySearch('daft punk', 'access-token-123');
    const [url] = (globalThis.fetch as jest.Mock).mock.calls[0];
    expect(url).toContain('/api/spotify/search');
  });

  it('sends the Bearer token in the Authorization header', async () => {
    (globalThis.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ results: mockResults }),
    });

    await spotifySearch('query', 'my-bearer-token');
    const [, opts] = (globalThis.fetch as jest.Mock).mock.calls[0];
    expect(opts.headers['Authorization']).toBe('Bearer my-bearer-token');
  });

  it('encodes the query in the URL', async () => {
    (globalThis.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ results: [] }),
    });

    await spotifySearch('daft punk & robots', 'tok');
    const [url] = (globalThis.fetch as jest.Mock).mock.calls[0];
    expect(url).toContain(encodeURIComponent('daft punk & robots'));
  });

  it('returns the search results', async () => {
    (globalThis.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ results: mockResults }),
    });

    const results = await spotifySearch('get lucky', 'tok');
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({ trackId: 'sp-1', provider: 'spotify', artist: 'Daft Punk' });
  });

  it('respects the limit parameter', async () => {
    (globalThis.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ results: [] }),
    });

    await spotifySearch('test', 'tok', 5);
    const [url] = (globalThis.fetch as jest.Mock).mock.calls[0];
    expect(url).toContain('limit=5');
  });

  it('throws when the server returns a non-ok response', async () => {
    (globalThis.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 401 });
    await expect(spotifySearch('query', 'bad-token')).rejects.toThrow('Spotify search failed');
  });
});
