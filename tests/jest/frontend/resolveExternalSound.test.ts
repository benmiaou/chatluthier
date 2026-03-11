/**
 * Unit tests for src/utils/resolveExternalSound.ts
 *
 * Tests the pure cross-provider resolution logic in complete isolation.
 * No React, no hooks, no real provider SDKs — only mock search functions.
 *
 * Scenarios:
 *  A – sender's provider is available → play directly, keep sender's track ID
 *  B – different provider connected → search fallback, return receiver's provider Sound
 *  C – no providers connected → return null
 *  D – search returns empty results → return null
 *  E – search throws → return null (graceful)
 *  F – missing artist/title → query is empty → return null (no pointless search)
 */

import { resolveExternalSound } from '../../../src/utils/resolveExternalSound';
import type { ExternalSoundPayload } from '../../../src/contexts/SocketContext';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const spotifyPayload: ExternalSoundPayload = {
  provider: 'spotify',
  trackId: 'spot-abc123',
  artist: 'Woodkid',
  title: 'Run Boy Run',
  album: 'The Golden Age',
  thumbnailUrl: 'https://example.com/thumb.jpg',
  previewUrl: 'https://example.com/preview.mp3',
};

const deezerHit = {
  trackId: 'dz-xyz789',
  artist: 'Woodkid',
  title: 'Run Boy Run',
  album: 'The Golden Age',
  thumbnailUrl: 'https://cdn.deezer.com/thumb.jpg',
  previewUrl: 'https://cdn.deezer.com/preview.mp3',
  permalinkUrl: 'https://www.deezer.com/track/xyz789',
};

const spotifyHit = {
  trackId: 'spot-found-456',
  artist: 'Woodkid',
  title: 'Run Boy Run',
  album: 'The Golden Age',
  thumbnailUrl: 'https://i.scdn.co/image/thumb.jpg',
  previewUrl: 'https://p.scdn.co/mp3-preview.mp3',
  permalinkUrl: 'https://open.spotify.com/track/found-456',
};

// ─── Scenario A: same provider ────────────────────────────────────────────────

describe('resolveExternalSound — Scenario A: same provider available', () => {
  it("returns a Sound using the sender's provider and trackId without searching", async () => {
    const searchSpy = jest.fn();
    const sound = await resolveExternalSound(spotifyPayload, ['spotify'], {
      spotify: searchSpy,
    });

    expect(sound).not.toBeNull();
    expect(sound!.provider).toBe('spotify');
    expect(sound!.providerTrackId).toBe('spot-abc123');
    expect(sound!.artist).toBe('Woodkid');
    expect(sound!.title).toBe('Run Boy Run');
    expect(searchSpy).not.toHaveBeenCalled();
  });

  it('sets the Sound id in the expected ext_recv format', async () => {
    const sound = await resolveExternalSound(spotifyPayload, ['spotify'], {});
    expect(sound!.id).toBe('ext_recv_spotify_spot-abc123');
  });

  it('sets isExternal = true', async () => {
    const sound = await resolveExternalSound(spotifyPayload, ['spotify'], {});
    expect(sound!.isExternal).toBe(true);
  });
});

// ─── Scenario B: different provider (fallback search) ─────────────────────────

describe('resolveExternalSound — Scenario B: different provider fallback', () => {
  it('searches the first connected provider and returns a Sound from the result', async () => {
    const deezerSearch = jest.fn().mockResolvedValue([deezerHit]);

    const sound = await resolveExternalSound(spotifyPayload, ['deezer'], {
      deezer: deezerSearch,
    });

    expect(deezerSearch).toHaveBeenCalledWith('Woodkid Run Boy Run');
    expect(sound).not.toBeNull();
    expect(sound!.provider).toBe('deezer');
    expect(sound!.providerTrackId).toBe('dz-xyz789');
    expect(sound!.artist).toBe('Woodkid');
    expect(sound!.permalinkUrl).toBe('https://www.deezer.com/track/xyz789');
  });

  it('uses the first connected provider when multiple are available', async () => {
    const spotifySearch = jest.fn().mockResolvedValue([spotifyHit]);
    const deezerSearch = jest.fn().mockResolvedValue([deezerHit]);

    // Both connected, spotify is first in the list
    const sound = await resolveExternalSound(
      { ...spotifyPayload, provider: 'soundcloud', trackId: 'sc-orig' },
      ['spotify', 'deezer'],
      { spotify: spotifySearch, deezer: deezerSearch }
    );

    expect(spotifySearch).toHaveBeenCalled();
    expect(deezerSearch).not.toHaveBeenCalled();
    expect(sound!.provider).toBe('spotify');
  });

  it("never uses the sender's original track ID when falling back", async () => {
    const deezerSearch = jest.fn().mockResolvedValue([deezerHit]);

    const sound = await resolveExternalSound(spotifyPayload, ['deezer'], {
      deezer: deezerSearch,
    });

    expect(sound!.providerTrackId).not.toBe(spotifyPayload.trackId);
    expect(sound!.providerTrackId).toBe(deezerHit.trackId);
  });
});

// ─── Scenario C: no providers connected ───────────────────────────────────────

describe('resolveExternalSound — Scenario C: no providers connected', () => {
  it('returns null when connectedProviders is empty', async () => {
    const sound = await resolveExternalSound(spotifyPayload, [], {});
    expect(sound).toBeNull();
  });
});

// ─── Scenario D: search returns no results ────────────────────────────────────

describe('resolveExternalSound — Scenario D: search returns empty', () => {
  it('returns null when the fallback search yields no results', async () => {
    const deezerSearch = jest.fn().mockResolvedValue([]);

    const sound = await resolveExternalSound(spotifyPayload, ['deezer'], {
      deezer: deezerSearch,
    });

    expect(sound).toBeNull();
  });
});

// ─── Scenario E: search throws ────────────────────────────────────────────────

describe('resolveExternalSound — Scenario E: search throws', () => {
  it('returns null gracefully when the search function rejects', async () => {
    const deezerSearch = jest.fn().mockRejectedValue(new Error('Network error'));

    const sound = await resolveExternalSound(spotifyPayload, ['deezer'], {
      deezer: deezerSearch,
    });

    expect(sound).toBeNull();
  });
});

// ─── Scenario F: missing artist and title ─────────────────────────────────────

describe('resolveExternalSound — Scenario F: empty query', () => {
  it('returns null without searching when artist and title are both missing', async () => {
    const deezerSearch = jest.fn().mockResolvedValue([deezerHit]);

    const payload: ExternalSoundPayload = {
      provider: 'soundcloud',
      trackId: 'sc-000',
      // no artist, no title
    };

    const sound = await resolveExternalSound(payload, ['deezer'], {
      deezer: deezerSearch,
    });

    expect(deezerSearch).not.toHaveBeenCalled();
    expect(sound).toBeNull();
  });
});
