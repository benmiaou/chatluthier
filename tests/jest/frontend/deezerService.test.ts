/**
 * Unit tests for deezerService.ts
 *
 * Tests pure utility functions, token storage (sessionStorage via jsdom),
 * OAuth URL generation, and the search function (mocked fetch).
 */

import {
  parseDeezerCallback,
  isDeezerTokenExpired,
  loadDeezerToken,
  saveDeezerToken,
  clearDeezerToken,
  getDeezerAuthUrl,
  deezerSearch,
  type DeezerToken,
} from '../../../src/services/deezerService';

// ─── parseDeezerCallback ──────────────────────────────────────────────────────

describe('parseDeezerCallback', () => {
  it('returns null for empty hash', () => {
    expect(parseDeezerCallback('')).toBeNull();
  });

  it('returns null when access_token is missing', () => {
    expect(parseDeezerCallback('#expires=3600')).toBeNull();
  });

  it('parses access_token and computes expires_at from expires param', () => {
    const before = Date.now();
    const result = parseDeezerCallback('#access_token=mytoken&expires=3600');
    const after = Date.now();

    expect(result).not.toBeNull();
    expect(result!.access_token).toBe('mytoken');
    // expires_at should be roughly now + 3600 seconds
    expect(result!.expires_at).toBeGreaterThanOrEqual(before + 3600 * 1000 - 10);
    expect(result!.expires_at).toBeLessThanOrEqual(after + 3600 * 1000 + 10);
  });

  it('defaults expires_at to 1 hour when expires is 0', () => {
    const before = Date.now();
    const result = parseDeezerCallback('#access_token=tok&expires=0');
    const after = Date.now();

    expect(result!.expires_at).toBeGreaterThanOrEqual(before + 3600 * 1000 - 10);
    expect(result!.expires_at).toBeLessThanOrEqual(after + 3600 * 1000 + 10);
  });

  it('strips leading # before parsing', () => {
    const result = parseDeezerCallback('#access_token=abc&expires=7200');
    expect(result!.access_token).toBe('abc');
  });

  it('works without a leading #', () => {
    const result = parseDeezerCallback('access_token=abc&expires=3600');
    expect(result!.access_token).toBe('abc');
  });
});

// ─── isDeezerTokenExpired ─────────────────────────────────────────────────────

describe('isDeezerTokenExpired', () => {
  it('returns true for null token', () => {
    expect(isDeezerTokenExpired(null)).toBe(true);
  });

  it('returns true for expired token (expires_at in the past)', () => {
    const token: DeezerToken = { access_token: 'tok', expires_at: Date.now() - 10_000 };
    expect(isDeezerTokenExpired(token)).toBe(true);
  });

  it('returns true within the 60s buffer before expiry', () => {
    const token: DeezerToken = { access_token: 'tok', expires_at: Date.now() + 30_000 }; // 30s left
    expect(isDeezerTokenExpired(token)).toBe(true);
  });

  it('returns false for a valid token with plenty of time left', () => {
    const token: DeezerToken = { access_token: 'tok', expires_at: Date.now() + 3600_000 };
    expect(isDeezerTokenExpired(token)).toBe(false);
  });
});

// ─── Token storage (sessionStorage) ──────────────────────────────────────────

describe('Deezer token storage', () => {
  beforeEach(() => sessionStorage.clear());

  const token: DeezerToken = { access_token: 'my-access-token', expires_at: Date.now() + 3600_000 };

  it('loadDeezerToken returns null when nothing is stored', () => {
    expect(loadDeezerToken()).toBeNull();
  });

  it('saveDeezerToken persists token to sessionStorage', () => {
    saveDeezerToken(token);
    const raw = sessionStorage.getItem('deezer_token');
    expect(raw).not.toBeNull();
    expect(JSON.parse(raw!)).toMatchObject({ access_token: 'my-access-token' });
  });

  it('loadDeezerToken retrieves the stored token', () => {
    saveDeezerToken(token);
    const loaded = loadDeezerToken();
    expect(loaded).toMatchObject(token);
  });

  it('clearDeezerToken removes the token from sessionStorage', () => {
    saveDeezerToken(token);
    clearDeezerToken();
    expect(loadDeezerToken()).toBeNull();
  });

  it('loadDeezerToken returns null on corrupt JSON', () => {
    sessionStorage.setItem('deezer_token', 'not-json{{{');
    expect(loadDeezerToken()).toBeNull();
  });
});

// ─── getDeezerAuthUrl ─────────────────────────────────────────────────────────

describe('getDeezerAuthUrl', () => {
  it('returns a URL pointing to deezer.com', () => {
    const url = getDeezerAuthUrl('http://localhost:3000/callback');
    expect(url).toContain('connect.deezer.com');
  });

  it('includes the redirect_uri in the URL', () => {
    const redirectUri = 'http://localhost:3000/callback';
    const url = getDeezerAuthUrl(redirectUri);
    expect(url).toContain(encodeURIComponent(redirectUri));
  });

  it('includes response_type=token for implicit grant', () => {
    const url = getDeezerAuthUrl('http://localhost/cb');
    expect(url).toContain('response_type=token');
  });

  it('includes the app_id from env', () => {
    const url = getDeezerAuthUrl('http://localhost/cb');
    expect(url).toContain('test-deezer-app-id');
  });
});

// ─── deezerSearch ─────────────────────────────────────────────────────────────

describe('deezerSearch', () => {
  beforeEach(() => {
    (globalThis.fetch as jest.Mock).mockReset();
  });

  const mockResults = [
    {
      trackId: 'dz-1',
      title: 'One More Time',
      artist: 'Daft Punk',
      album: 'Discovery',
      durationMs: 320000,
      thumbnailUrl: 'https://example.com/thumb.jpg',
      previewUrl: 'https://example.com/prev.mp3',
      provider: 'deezer',
    },
  ];

  it('calls the proxy endpoint with the encoded query', async () => {
    (globalThis.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ results: mockResults }),
    });

    await deezerSearch('daft punk');
    const [url] = (globalThis.fetch as jest.Mock).mock.calls[0];
    expect(url).toContain('/api/deezer/search');
    expect(url).toContain(encodeURIComponent('daft punk'));
  });

  it('returns the results array from the response', async () => {
    (globalThis.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ results: mockResults }),
    });

    const results = await deezerSearch('daft punk');
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({ trackId: 'dz-1', provider: 'deezer' });
  });

  it('throws when the server responds with an error', async () => {
    (globalThis.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 500 });
    await expect(deezerSearch('query')).rejects.toThrow('Deezer search failed');
  });

  it('respects the limit parameter', async () => {
    (globalThis.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ results: [] }),
    });

    await deezerSearch('test', 5);
    expect((globalThis.fetch as jest.Mock).mock.calls[0][0]).toContain('limit=5');
  });
});
