/**
 * Functional (integration) tests for external sounds API
 *
 * Requires a running server at http://localhost:3000
 * Run with: node tests/test_external_sounds_api.js
 */

const fetch = require('node-fetch');

const BASE = 'http://localhost:3000';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const cookies = {};

async function request(url, options = {}) {
  const cookieHeader = Object.entries(cookies)
    .map(([k, v]) => `${k}=${v}`)
    .join('; ');

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      ...(options.headers || {}),
    },
  });

  // Persist cookies
  const setCookieHeaders = response.headers.raw()['set-cookie'] || [];
  setCookieHeaders.forEach((str) => {
    const [part] = str.split(';');
    const [name, value] = part.split('=');
    if (name && value !== undefined) cookies[name.trim()] = value.trim();
  });

  return response;
}

let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    console.log(`  ✅ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ ${name}`);
    console.error(`     ${err.message}`);
    failed++;
  }
}

// ─── Test state ───────────────────────────────────────────────────────────────

const uniqueSuffix = Date.now();
const testUser = {
  pseudo: `ext_sounds_test_${uniqueSuffix}`,
  password: 'testpassword123',
  secretQuestion: 'test',
  secretAnswer: 'test',
};
let userId = null;
let createdSoundId = null;

// ─── Tests ────────────────────────────────────────────────────────────────────

async function runTests() {
  console.log('🌐 Functional API tests — external sounds\n');

  // ── Server check ─────────────────────────────────────────────────────────────
  console.log('Server check');

  await test('server is reachable', async () => {
    const res = await request(`${BASE}/health`);
    if (!res.ok) throw new Error(`Health check returned ${res.status}`);
  });

  // ── Auth setup ────────────────────────────────────────────────────────────────
  console.log('\nAuth setup');

  await test('registers a test user', async () => {
    const res = await request(`${BASE}/register`, {
      method: 'POST',
      body: JSON.stringify(testUser),
    });
    const data = await res.json();
    if (!data.success && !data.userId) throw new Error(JSON.stringify(data));
    userId = data.userId;
    if (!userId) throw new Error('No userId in register response');
  });

  await test('logs in with test user', async () => {
    const res = await request(`${BASE}/login`, {
      method: 'POST',
      body: JSON.stringify({ pseudo: testUser.pseudo, password: testUser.password }),
    });
    const data = await res.json();
    if (!data.success && !data.userId) throw new Error(JSON.stringify(data));
    if (data.userId) userId = data.userId;
  });

  if (!userId) {
    console.error('\n💥 Cannot continue without a valid userId. Aborting.');
    process.exit(1);
  }

  // ── GET (empty) ───────────────────────────────────────────────────────────────
  console.log('\nGET /external-sounds');

  await test('returns empty array for new user', async () => {
    const res = await request(`${BASE}/external-sounds?userId=${userId}`);
    const data = await res.json();
    if (!Array.isArray(data)) throw new Error(`Expected array, got: ${JSON.stringify(data)}`);
    if (data.length !== 0) throw new Error(`Expected 0 sounds, got ${data.length}`);
  });

  await test('returns 400 without userId', async () => {
    const res = await request(`${BASE}/external-sounds`);
    if (res.status !== 400) throw new Error(`Expected 400, got ${res.status}`);
  });

  // ── POST ──────────────────────────────────────────────────────────────────────
  console.log('\nPOST /external-sounds');

  await test('returns 400 for missing required fields', async () => {
    const res = await request(`${BASE}/external-sounds`, {
      method: 'POST',
      body: JSON.stringify({ userId, provider: 'spotify' }),
    });
    if (res.status !== 400) throw new Error(`Expected 400, got ${res.status}`);
  });

  await test('returns 400 for invalid provider', async () => {
    const res = await request(`${BASE}/external-sounds`, {
      method: 'POST',
      body: JSON.stringify({
        userId, provider: 'napster', trackId: 't1', artist: 'A', title: 'B',
      }),
    });
    if (res.status !== 400) throw new Error(`Expected 400, got ${res.status}`);
    const data = await res.json();
    if (!data.error.includes('Invalid provider')) throw new Error(`Wrong error: ${data.error}`);
  });

  await test('creates a Spotify sound and returns 201', async () => {
    const res = await request(`${BASE}/external-sounds`, {
      method: 'POST',
      body: JSON.stringify({
        userId,
        provider: 'spotify',
        trackId: 'spotify-test-track-001',
        artist: 'Daft Punk',
        title: 'One More Time',
        album: 'Discovery',
        durationMs: 320000,
        thumbnailUrl: 'https://example.com/thumb.jpg',
        previewUrl: 'https://example.com/preview.mp3',
        contexts: [['medium', 'exploration']],
      }),
    });
    if (res.status !== 201) throw new Error(`Expected 201, got ${res.status}`);
    const data = await res.json();
    if (!data.dbId) throw new Error('Missing dbId in response');
    if (data.isExternal !== true) throw new Error('isExternal should be true');
    if (data.filename !== null) throw new Error('filename should be null for external sounds');
    if (data.provider !== 'spotify') throw new Error(`Wrong provider: ${data.provider}`);
    if (data.artist !== 'Daft Punk') throw new Error(`Wrong artist: ${data.artist}`);
    createdSoundId = data.dbId;
  });

  await test('creates a Deezer sound', async () => {
    const res = await request(`${BASE}/external-sounds`, {
      method: 'POST',
      body: JSON.stringify({
        userId,
        provider: 'deezer',
        trackId: 'deezer-test-track-002',
        artist: 'Justice',
        title: 'D.A.N.C.E.',
        contexts: [['low', 'ambient']],
      }),
    });
    if (res.status !== 201) throw new Error(`Expected 201, got ${res.status}`);
    const data = await res.json();
    if (data.provider !== 'deezer') throw new Error(`Wrong provider: ${data.provider}`);
  });

  await test('creates a SoundCloud sound', async () => {
    const res = await request(`${BASE}/external-sounds`, {
      method: 'POST',
      body: JSON.stringify({
        userId,
        provider: 'soundcloud',
        trackId: 'soundcloud-test-track-003',
        artist: 'Bonobo',
        title: 'Kong',
      }),
    });
    if (res.status !== 201) throw new Error(`Expected 201, got ${res.status}`);
  });

  await test('returns 409 for duplicate track', async () => {
    const res = await request(`${BASE}/external-sounds`, {
      method: 'POST',
      body: JSON.stringify({
        userId,
        provider: 'spotify',
        trackId: 'spotify-test-track-001',
        artist: 'Daft Punk',
        title: 'One More Time',
      }),
    });
    if (res.status !== 409) throw new Error(`Expected 409, got ${res.status}`);
    const data = await res.json();
    if (!data.error.includes('already in your playlist')) throw new Error(`Wrong error: ${data.error}`);
  });

  // ── GET (with sounds) ─────────────────────────────────────────────────────────
  console.log('\nGET /external-sounds (with data)');

  await test('returns all 3 created sounds', async () => {
    const res = await request(`${BASE}/external-sounds?userId=${userId}`);
    const data = await res.json();
    if (!Array.isArray(data)) throw new Error('Expected array');
    if (data.length !== 3) throw new Error(`Expected 3 sounds, got ${data.length}`);
    if (!data.every((s) => s.isExternal === true)) throw new Error('Not all sounds have isExternal=true');
    if (!data.every((s) => s.filename === null)) throw new Error('Not all sounds have filename=null');
  });

  await test('each sound has required fields', async () => {
    const res = await request(`${BASE}/external-sounds?userId=${userId}`);
    const data = await res.json();
    for (const s of data) {
      for (const field of ['id', 'dbId', 'provider', 'providerTrackId', 'artist', 'title', 'contexts', 'isEnabled']) {
        if (!(field in s)) throw new Error(`Missing field "${field}" in sound ${s.id}`);
      }
    }
  });

  // ── GET /backgroundMusic — external sounds merged ─────────────────────────────
  console.log('\nGET /backgroundMusic (merging external sounds)');

  await test('external sounds appear at the end of the backgroundMusic list', async () => {
    const res = await request(`${BASE}/backgroundMusic?userId=${userId}`);
    if (!res.ok) throw new Error(`backgroundMusic returned ${res.status}`);
    const data = await res.json();
    if (!Array.isArray(data)) throw new Error('Expected array from /backgroundMusic');
    const externalSounds = data.filter((s) => s.isExternal === true);
    if (externalSounds.length !== 3) {
      throw new Error(`Expected 3 external sounds in playlist, got ${externalSounds.length}`);
    }
  });

  await test('/backgroundMusic without userId has no external sounds', async () => {
    const res = await request(`${BASE}/backgroundMusic`);
    if (!res.ok) throw new Error(`backgroundMusic returned ${res.status}`);
    const data = await res.json();
    const externalSounds = data.filter((s) => s.isExternal === true);
    if (externalSounds.length > 0) {
      throw new Error(`Expected 0 external sounds without userId, got ${externalSounds.length}`);
    }
  });

  // ── PATCH ─────────────────────────────────────────────────────────────────────
  console.log('\nPATCH /external-sounds/:id');

  await test('returns 400 without userId', async () => {
    const res = await request(`${BASE}/external-sounds/${createdSoundId}`, {
      method: 'PATCH',
      body: JSON.stringify({ isEnabled: false }),
    });
    if (res.status !== 400) throw new Error(`Expected 400, got ${res.status}`);
  });

  await test('returns 404 for non-existent id', async () => {
    const res = await request(`${BASE}/external-sounds/99999999`, {
      method: 'PATCH',
      body: JSON.stringify({ userId, isEnabled: false }),
    });
    if (res.status !== 404) throw new Error(`Expected 404, got ${res.status}`);
  });

  await test('updates contexts and isEnabled', async () => {
    const res = await request(`${BASE}/external-sounds/${createdSoundId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        userId,
        contexts: [['high', 'boss_fight']],
        isEnabled: false,
      }),
    });
    if (!res.ok) throw new Error(`Expected 2xx, got ${res.status}`);
    const data = await res.json();
    if (!data.success) throw new Error('Expected success: true');
  });

  await test('changes are persisted after PATCH', async () => {
    const res = await request(`${BASE}/external-sounds?userId=${userId}`);
    const data = await res.json();
    const sound = data.find((s) => s.dbId === createdSoundId);
    if (!sound) throw new Error('Could not find patched sound');
    if (sound.isEnabled !== false) throw new Error('isEnabled should be false');
    if (JSON.stringify(sound.contexts) !== JSON.stringify([['high', 'boss_fight']])) {
      throw new Error(`Wrong contexts: ${JSON.stringify(sound.contexts)}`);
    }
  });

  // ── DELETE ────────────────────────────────────────────────────────────────────
  console.log('\nDELETE /external-sounds/:id');

  await test('returns 400 without userId', async () => {
    const res = await request(`${BASE}/external-sounds/${createdSoundId}`, { method: 'DELETE' });
    if (res.status !== 400) throw new Error(`Expected 400, got ${res.status}`);
  });

  await test('returns 404 for non-existent id', async () => {
    const res = await request(`${BASE}/external-sounds/99999999?userId=${userId}`, { method: 'DELETE' });
    if (res.status !== 404) throw new Error(`Expected 404, got ${res.status}`);
  });

  await test('deletes sound and returns success', async () => {
    const res = await request(`${BASE}/external-sounds/${createdSoundId}?userId=${userId}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error(`Expected 2xx, got ${res.status}`);
    const data = await res.json();
    if (!data.success) throw new Error('Expected success: true');
  });

  await test('deleted sound no longer appears in list', async () => {
    const res = await request(`${BASE}/external-sounds?userId=${userId}`);
    const data = await res.json();
    const found = data.find((s) => s.dbId === createdSoundId);
    if (found) throw new Error('Deleted sound is still in the list');
    if (data.length !== 2) throw new Error(`Expected 2 remaining sounds, got ${data.length}`);
  });

  // ── Summary ───────────────────────────────────────────────────────────────────
  console.log(`\n📊 Functional test summary: ${passed} passed, ${failed} failed`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('💥 Functional test runner crashed:', err);
  process.exit(1);
});
