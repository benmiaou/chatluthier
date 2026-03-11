/**
 * Unit tests for soundcloudService.ts
 *
 * Covers: token helpers, expiry check, PKCE auth URL generation,
 * token exchange/refresh (mocked fetch), and search.
 */

import {
  loadSoundCloudToken,
  saveSoundCloudToken,
  clearSoundCloudToken,
  isSoundCloudTokenExpired,
  getSoundCloudAuthUrl,
  exchangeSoundCloudCode,
  refreshSoundCloudToken,
  soundCloudSearch,
  type SoundCloudToken,
} from '../../../src/services/soundcloudService';

// ─── isSoundCloudTokenExpired ─────────────────────────────────────────────────

describe('isSoundCloudTokenExpired', () => {
  it('returns true for null', () => {
    expect(isSoundCloudTokenExpired(null)).toBe(true);
  });

  it('returns true for expired token', () => {
    const token: SoundCloudToken = {
      access_token: 'tok',
      expires_in: 3600,
      expires_at: Date.now() - 1000,
    };
    expect(isSoundCloudTokenExpired(token)).toBe(true);
  });

  it('returns true within the 60s buffer window', () => {
    const token: SoundCloudToken = {
      access_token: 'tok',
      expires_in: 3600,
      expires_at: Date.now() + 30_000, // expires in 30s — inside 60s buffer
    };
    expect(isSoundCloudTokenExpired(token)).toBe(true);
  });

  it('returns false for a valid token with time to spare', () => {
    const token: SoundCloudToken = {
      access_token: 'tok',
      expires_in: 3600,
      expires_at: Date.now() + 3600_000,
    };
    expect(isSoundCloudTokenExpired(token)).toBe(false);
  });
});

// ─── Token storage ────────────────────────────────────────────────────────────

describe('SoundCloud token storage', () => {
  const token: SoundCloudToken = {
    access_token: 'sc-access-token',
    refresh_token: 'sc-refresh-token',
    expires_in: 3600,
    expires_at: Date.now() + 3600_000,
  };

  beforeEach(() => sessionStorage.clear());

  it('returns null when nothing is stored', () => {
    expect(loadSoundCloudToken()).toBeNull();
  });

  it('saves and loads a token', () => {
    saveSoundCloudToken(token);
    expect(loadSoundCloudToken()).toMatchObject({ access_token: 'sc-access-token' });
  });

  it('persists refresh_token', () => {
    saveSoundCloudToken(token);
    expect(loadSoundCloudToken()!.refresh_token).toBe('sc-refresh-token');
  });

  it('clearSoundCloudToken removes the token', () => {
    saveSoundCloudToken(token);
    clearSoundCloudToken();
    expect(loadSoundCloudToken()).toBeNull();
  });

  it('returns null on corrupt stored JSON', () => {
    sessionStorage.setItem('soundcloud_token', '{invalid json');
    expect(loadSoundCloudToken()).toBeNull();
  });
});

// ─── getSoundCloudAuthUrl ─────────────────────────────────────────────────────

describe('getSoundCloudAuthUrl', () => {
  beforeEach(() => sessionStorage.clear());

  it('returns a URL pointing to SoundCloud authorize endpoint', async () => {
    const url = await getSoundCloudAuthUrl();
    expect(url).toContain('secure.soundcloud.com/authorize');
  });

  it('uses PKCE: includes code_challenge and code_challenge_method=S256', async () => {
    const url = await getSoundCloudAuthUrl();
    expect(url).toContain('code_challenge=');
    expect(url).toContain('code_challenge_method=S256');
  });

  it('uses response_type=code (authorization code flow)', async () => {
    const url = await getSoundCloudAuthUrl();
    expect(url).toContain('response_type=code');
  });

  it('stores code_verifier in sessionStorage', async () => {
    await getSoundCloudAuthUrl();
    const verifier = sessionStorage.getItem('soundcloud_code_verifier');
    expect(verifier).not.toBeNull();
    expect(verifier!.length).toBeGreaterThan(10);
  });

  it('generates a different verifier on each call', async () => {
    await getSoundCloudAuthUrl();
    const v1 = sessionStorage.getItem('soundcloud_code_verifier');
    await getSoundCloudAuthUrl();
    const v2 = sessionStorage.getItem('soundcloud_code_verifier');
    // Statistically safe: 32-byte random verifiers
    expect(v1).not.toBe(v2);
  });
});

// ─── exchangeSoundCloudCode ───────────────────────────────────────────────────

describe('exchangeSoundCloudCode', () => {
  beforeEach(() => {
    sessionStorage.clear();
    (globalThis.fetch as jest.Mock).mockReset();
  });

  it('calls /api/soundcloud/token with the code and verifier', async () => {
    sessionStorage.setItem('soundcloud_code_verifier', 'my-verifier');
    (globalThis.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ access_token: 'sc-tok', refresh_token: 'ref', expires_in: 3600 }),
    });

    await exchangeSoundCloudCode('auth-code-xyz');

    const [url, opts] = (globalThis.fetch as jest.Mock).mock.calls[0];
    expect(url).toBe('/api/soundcloud/token');
    expect(opts.method).toBe('POST');
    const body = JSON.parse(opts.body);
    expect(body.code).toBe('auth-code-xyz');
    expect(body.code_verifier).toBe('my-verifier');
  });

  it('saves the token to sessionStorage', async () => {
    (globalThis.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ access_token: 'saved-tok', expires_in: 3600 }),
    });

    const result = await exchangeSoundCloudCode('code');
    expect(result.access_token).toBe('saved-tok');
    expect(loadSoundCloudToken()?.access_token).toBe('saved-tok');
  });

  it('removes the code_verifier from sessionStorage after exchange', async () => {
    sessionStorage.setItem('soundcloud_code_verifier', 'v');
    (globalThis.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ access_token: 't', expires_in: 3600 }),
    });
    await exchangeSoundCloudCode('code');
    expect(sessionStorage.getItem('soundcloud_code_verifier')).toBeNull();
  });

  it('throws when the server returns an error response', async () => {
    (globalThis.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'invalid_grant' }),
    });
    await expect(exchangeSoundCloudCode('bad-code')).rejects.toThrow('invalid_grant');
  });
});

// ─── refreshSoundCloudToken ───────────────────────────────────────────────────

describe('refreshSoundCloudToken', () => {
  beforeEach(() => {
    (globalThis.fetch as jest.Mock).mockReset();
  });

  it('calls /api/soundcloud/refresh with the refresh_token', async () => {
    (globalThis.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ access_token: 'new-tok', expires_in: 3600 }),
    });

    await refreshSoundCloudToken('my-refresh-token');

    const [url, opts] = (globalThis.fetch as jest.Mock).mock.calls[0];
    expect(url).toBe('/api/soundcloud/refresh');
    expect(JSON.parse(opts.body).refresh_token).toBe('my-refresh-token');
  });

  it('saves the refreshed token', async () => {
    (globalThis.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ access_token: 'refreshed', expires_in: 3600 }),
    });

    const result = await refreshSoundCloudToken('rt');
    expect(result.access_token).toBe('refreshed');
    expect(loadSoundCloudToken()?.access_token).toBe('refreshed');
  });

  it('throws when refresh fails', async () => {
    (globalThis.fetch as jest.Mock).mockResolvedValue({ ok: false });
    await expect(refreshSoundCloudToken('bad-rt')).rejects.toThrow(
      'SoundCloud token refresh failed'
    );
  });
});

// ─── soundCloudSearch ─────────────────────────────────────────────────────────

describe('soundCloudSearch', () => {
  beforeEach(() => (globalThis.fetch as jest.Mock).mockReset());

  const mockResults = [
    {
      trackId: 'sc-1',
      title: 'Kong',
      artist: 'Bonobo',
      album: '',
      durationMs: 280000,
      thumbnailUrl: '',
      previewUrl: '',
      permalinkUrl: 'https://soundcloud.com/bonobo/kong',
      provider: 'soundcloud',
    },
  ];

  it('calls the proxy search endpoint', async () => {
    (globalThis.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ results: mockResults }),
    });

    await soundCloudSearch('bonobo', null);
    expect((globalThis.fetch as jest.Mock).mock.calls[0][0]).toContain('/api/soundcloud/search');
  });

  it('includes OAuth header when accessToken is provided', async () => {
    (globalThis.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ results: [] }),
    });

    await soundCloudSearch('query', 'my-sc-token');
    const opts = (globalThis.fetch as jest.Mock).mock.calls[0][1];
    expect(opts.headers['Authorization']).toBe('OAuth my-sc-token');
  });

  it('omits Authorization header when accessToken is null', async () => {
    (globalThis.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ results: [] }),
    });

    await soundCloudSearch('query', null);
    const opts = (globalThis.fetch as jest.Mock).mock.calls[0][1];
    expect(opts.headers['Authorization']).toBeUndefined();
  });

  it('returns the results from the response', async () => {
    (globalThis.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ results: mockResults }),
    });

    const results = await soundCloudSearch('bonobo', null);
    expect(results).toHaveLength(1);
    expect(results[0].provider).toBe('soundcloud');
  });

  it('throws on non-ok response', async () => {
    (globalThis.fetch as jest.Mock).mockResolvedValue({ ok: false });
    await expect(soundCloudSearch('query', null)).rejects.toThrow('SoundCloud search failed');
  });

  it('passes limit in query params', async () => {
    (globalThis.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ results: [] }),
    });

    await soundCloudSearch('test', null, 10);
    expect((globalThis.fetch as jest.Mock).mock.calls[0][0]).toContain('limit=10');
  });
});
