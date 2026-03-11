/**
 * Unit tests for external sounds controller
 *
 * Uses an in-memory SQLite database so no running server is needed.
 * The DB singleton is patched to use the in-memory connection before the
 * controller is required.
 */

const assert = require('assert');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// ─── Setup in-memory DB ───────────────────────────────────────────────────────

const CREATE_TABLE = `
  CREATE TABLE IF NOT EXISTS external_sounds (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    provider TEXT NOT NULL CHECK(provider IN ('spotify', 'deezer', 'soundcloud')),
    provider_track_id TEXT NOT NULL,
    artist TEXT NOT NULL,
    title TEXT NOT NULL,
    album TEXT,
    duration_ms INTEGER,
    thumbnail_url TEXT,
    preview_url TEXT,
    contexts TEXT,
    is_enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, provider, provider_track_id)
  );
`;

let memDb;

async function setupInMemoryDb() {
  return new Promise((resolve, reject) => {
    memDb = new sqlite3.Database(':memory:', (err) => {
      if (err) return reject(err);
      memDb.exec(CREATE_TABLE, (err2) => {
        if (err2) return reject(err2);
        resolve();
      });
    });
  });
}

// Patch the db singleton to use our in-memory connection
function patchDbSingleton() {
  const db = require(path.join(__dirname, '../srv/database/db'));
  db.db = memDb;
  return db;
}

// ─── Mock req / res helpers ───────────────────────────────────────────────────

function mockReq({ query = {}, params = {}, headers = {}, body = {} } = {}) {
  return { query, params, headers, body };
}

function mockRes() {
  const res = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    },
  };
  return res;
}

// ─── Test runner helpers ──────────────────────────────────────────────────────

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

// ─── Tests ────────────────────────────────────────────────────────────────────

async function runTests() {
  console.log('🔬 Unit tests — external sounds controller\n');

  await setupInMemoryDb();
  patchDbSingleton();

  // Require controller AFTER patching the singleton
  const {
    getExternalSounds,
    addExternalSound,
    deleteExternalSound,
    updateExternalSound,
  } = require(path.join(__dirname, '../srv/controllers/externalSoundsController'));

  const userId = 'unit-test-user-1';

  // ── GET ──────────────────────────────────────────────────────────────────────
  console.log('GET /external-sounds');

  await test('returns 400 when userId is missing', async () => {
    const req = mockReq();
    const res = mockRes();
    await getExternalSounds(req, res);
    assert.strictEqual(res.statusCode, 400);
    assert.ok(res.body.error);
  });

  await test('returns empty array when user has no sounds', async () => {
    const req = mockReq({ query: { userId } });
    const res = mockRes();
    await getExternalSounds(req, res);
    assert.strictEqual(res.statusCode, 200);
    assert.deepStrictEqual(res.body, []);
  });

  // ── POST ─────────────────────────────────────────────────────────────────────
  console.log('\nPOST /external-sounds');

  await test('returns 400 when required fields are missing', async () => {
    const req = mockReq({ body: { userId, provider: 'spotify' } }); // missing trackId, artist, title
    const res = mockRes();
    await addExternalSound(req, res);
    assert.strictEqual(res.statusCode, 400);
    assert.ok(res.body.error);
  });

  await test('returns 400 for invalid provider', async () => {
    const req = mockReq({
      body: { userId, provider: 'napster', trackId: 't1', artist: 'Artist', title: 'Title' },
    });
    const res = mockRes();
    await addExternalSound(req, res);
    assert.strictEqual(res.statusCode, 400);
    assert.match(res.body.error, /Invalid provider/);
  });

  let createdId;

  await test('creates a sound and returns 201 with formatted shape', async () => {
    const req = mockReq({
      body: {
        userId,
        provider: 'spotify',
        trackId: 'spotify-track-abc',
        artist: 'Daft Punk',
        title: 'Harder Better Faster Stronger',
        album: 'Discovery',
        durationMs: 224000,
        thumbnailUrl: 'https://example.com/thumb.jpg',
        previewUrl: 'https://example.com/preview.mp3',
        contexts: [['medium', 'combat']],
      },
    });
    const res = mockRes();
    await addExternalSound(req, res);
    assert.strictEqual(res.statusCode, 201);
    assert.ok(res.body.dbId);
    assert.strictEqual(res.body.isExternal, true);
    assert.strictEqual(res.body.provider, 'spotify');
    assert.strictEqual(res.body.providerTrackId, 'spotify-track-abc');
    assert.strictEqual(res.body.artist, 'Daft Punk');
    assert.strictEqual(res.body.filename, null);
    assert.deepStrictEqual(res.body.contexts, [['medium', 'combat']]);
    createdId = res.body.dbId;
  });

  await test('returns 409 on duplicate (same user + provider + trackId)', async () => {
    const req = mockReq({
      body: {
        userId,
        provider: 'spotify',
        trackId: 'spotify-track-abc',
        artist: 'Daft Punk',
        title: 'Harder Better Faster Stronger',
      },
    });
    const res = mockRes();
    await addExternalSound(req, res);
    assert.strictEqual(res.statusCode, 409);
    assert.match(res.body.error, /already in your playlist/);
  });

  await test('same trackId is allowed for a different user', async () => {
    const req = mockReq({
      body: {
        userId: 'unit-test-user-2',
        provider: 'spotify',
        trackId: 'spotify-track-abc',
        artist: 'Daft Punk',
        title: 'Harder Better Faster Stronger',
      },
    });
    const res = mockRes();
    await addExternalSound(req, res);
    assert.strictEqual(res.statusCode, 201);
  });

  // ── GET after insert ─────────────────────────────────────────────────────────
  console.log('\nGET /external-sounds (after insert)');

  await test('returns the inserted sound', async () => {
    const req = mockReq({ query: { userId } });
    const res = mockRes();
    await getExternalSounds(req, res);
    assert.strictEqual(res.body.length, 1);
    assert.strictEqual(res.body[0].provider, 'spotify');
    assert.strictEqual(res.body[0].title, 'Harder Better Faster Stronger');
    assert.strictEqual(res.body[0].isExternal, true);
  });

  // ── PATCH ────────────────────────────────────────────────────────────────────
  console.log('\nPATCH /external-sounds/:id');

  await test('returns 400 when userId is missing', async () => {
    const req = mockReq({ params: { id: String(createdId) }, body: {} });
    const res = mockRes();
    await updateExternalSound(req, res);
    assert.strictEqual(res.statusCode, 400);
  });

  await test('returns 404 for non-existent id', async () => {
    const req = mockReq({ params: { id: '9999' }, body: { userId, isEnabled: false } });
    const res = mockRes();
    await updateExternalSound(req, res);
    assert.strictEqual(res.statusCode, 404);
  });

  await test('updates contexts', async () => {
    const req = mockReq({
      params: { id: String(createdId) },
      body: { userId, contexts: [['high', 'boss_fight']] },
    });
    const res = mockRes();
    await updateExternalSound(req, res);
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
  });

  await test('updated contexts are persisted', async () => {
    const req = mockReq({ query: { userId } });
    const res = mockRes();
    await getExternalSounds(req, res);
    assert.deepStrictEqual(res.body[0].contexts, [['high', 'boss_fight']]);
  });

  await test('disables a sound via isEnabled: false', async () => {
    const req = mockReq({
      params: { id: String(createdId) },
      body: { userId, isEnabled: false },
    });
    const res = mockRes();
    await updateExternalSound(req, res);
    assert.strictEqual(res.statusCode, 200);
  });

  await test('disabled state is persisted', async () => {
    const req = mockReq({ query: { userId } });
    const res = mockRes();
    await getExternalSounds(req, res);
    assert.strictEqual(res.body[0].isEnabled, false);
  });

  await test('returns 404 when userId does not own the sound', async () => {
    const req = mockReq({
      params: { id: String(createdId) },
      body: { userId: 'wrong-user', isEnabled: true },
    });
    const res = mockRes();
    await updateExternalSound(req, res);
    assert.strictEqual(res.statusCode, 404);
  });

  // ── DELETE ───────────────────────────────────────────────────────────────────
  console.log('\nDELETE /external-sounds/:id');

  await test('returns 400 when userId is missing', async () => {
    const req = mockReq({ params: { id: String(createdId) }, query: {} });
    const res = mockRes();
    await deleteExternalSound(req, res);
    assert.strictEqual(res.statusCode, 400);
  });

  await test('returns 404 when userId does not own the sound', async () => {
    const req = mockReq({ params: { id: String(createdId) }, query: { userId: 'wrong-user' } });
    const res = mockRes();
    await deleteExternalSound(req, res);
    assert.strictEqual(res.statusCode, 404);
  });

  await test('deletes the sound and returns success', async () => {
    const req = mockReq({ params: { id: String(createdId) }, query: { userId } });
    const res = mockRes();
    await deleteExternalSound(req, res);
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
  });

  await test('sound is no longer returned after deletion', async () => {
    const req = mockReq({ query: { userId } });
    const res = mockRes();
    await getExternalSounds(req, res);
    assert.deepStrictEqual(res.body, []);
  });

  // ── Summary ──────────────────────────────────────────────────────────────────
  console.log(`\n📊 Unit test summary: ${passed} passed, ${failed} failed`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('💥 Unit test runner crashed:', err);
  process.exit(1);
});
