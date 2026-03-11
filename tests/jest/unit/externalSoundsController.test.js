/**
 * Unit tests for externalSoundsController
 *
 * The database module is fully mocked — no SQLite connection needed.
 * This verifies request validation, DB interaction contracts, and
 * response shaping in complete isolation.
 */

// jest.mock is hoisted before requires, so we use literal relative paths here
jest.mock('../../../srv/database/db', () => ({
  query: jest.fn(),
  queryOne: jest.fn(),
  execute: jest.fn(),
}));

const db = require('../../../srv/database/db');
const {
  getExternalSounds,
  addExternalSound,
  deleteExternalSound,
  updateExternalSound,
} = require('../../../srv/controllers/externalSoundsController');

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mockReq({ query = {}, params = {}, headers = {}, body = {} } = {}) {
  return { query, params, headers, body };
}

function mockRes() {
  const res = {
    statusCode: 200,
    _json: null,
    status: jest.fn().mockImplementation(function (code) {
      this.statusCode = code;
      return this;
    }),
    json: jest.fn().mockImplementation(function (data) {
      this._json = data;
      return this;
    }),
  };
  return res;
}

/** A realistic DB row for an external sound */
const DB_ROW = {
  id: 42,
  user_id: 'user-abc',
  provider: 'spotify',
  provider_track_id: 'spotify-track-001',
  artist: 'Daft Punk',
  title: 'One More Time',
  album: 'Discovery',
  duration_ms: 320000,
  thumbnail_url: 'https://example.com/thumb.jpg',
  preview_url: 'https://example.com/preview.mp3',
  contexts: '[["medium","combat"]]',
  is_enabled: 1,
  created_at: '2024-01-01T00:00:00Z',
};

// ─── getExternalSounds ────────────────────────────────────────────────────────

describe('getExternalSounds', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 400 when userId is absent from query and headers', async () => {
    const res = mockRes();
    await getExternalSounds(mockReq(), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res._json).toMatchObject({ error: expect.any(String) });
  });

  it('accepts userId from query string', async () => {
    db.query.mockResolvedValue([]);
    const res = mockRes();
    await getExternalSounds(mockReq({ query: { userId: 'u1' } }), res);
    expect(db.query).toHaveBeenCalledWith(expect.stringContaining('SELECT'), ['u1']);
    expect(res._json).toEqual([]);
  });

  it('accepts userId from request header', async () => {
    db.query.mockResolvedValue([]);
    const res = mockRes();
    await getExternalSounds(mockReq({ headers: { 'user-id': 'u2' } }), res);
    expect(db.query).toHaveBeenCalledWith(expect.stringContaining('SELECT'), ['u2']);
  });

  it('maps DB rows to the expected Sound shape', async () => {
    db.query.mockResolvedValue([DB_ROW]);
    const res = mockRes();
    await getExternalSounds(mockReq({ query: { userId: 'user-abc' } }), res);

    expect(res._json).toHaveLength(1);
    expect(res._json[0]).toMatchObject({
      id: 'ext_42',
      dbId: 42,
      filename: null,
      isExternal: true,
      provider: 'spotify',
      providerTrackId: 'spotify-track-001',
      artist: 'Daft Punk',
      title: 'One More Time',
      album: 'Discovery',
      durationMs: 320000,
      thumbnailUrl: 'https://example.com/thumb.jpg',
      previewUrl: 'https://example.com/preview.mp3',
      isEnabled: true,
      contexts: [['medium', 'combat']],
    });
  });

  it('handles is_enabled = 0 (disabled)', async () => {
    db.query.mockResolvedValue([{ ...DB_ROW, is_enabled: 0 }]);
    const res = mockRes();
    await getExternalSounds(mockReq({ query: { userId: 'user-abc' } }), res);
    expect(res._json[0].isEnabled).toBe(false);
  });

  it('handles missing contexts gracefully (null in DB)', async () => {
    db.query.mockResolvedValue([{ ...DB_ROW, contexts: null }]);
    const res = mockRes();
    await getExternalSounds(mockReq({ query: { userId: 'user-abc' } }), res);
    expect(res._json[0].contexts).toEqual([]);
  });

  it('returns 500 when DB throws', async () => {
    db.query.mockRejectedValue(new Error('DB failure'));
    const res = mockRes();
    await getExternalSounds(mockReq({ query: { userId: 'u1' } }), res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ─── addExternalSound ─────────────────────────────────────────────────────────

describe('addExternalSound', () => {
  beforeEach(() => jest.clearAllMocks());

  const validBody = {
    userId: 'user-abc',
    provider: 'spotify',
    trackId: 'spotify-track-001',
    artist: 'Daft Punk',
    title: 'One More Time',
    album: 'Discovery',
    durationMs: 320000,
    thumbnailUrl: 'https://example.com/thumb.jpg',
    previewUrl: 'https://example.com/preview.mp3',
    contexts: [['medium', 'combat']],
  };

  it.each([
    ['userId', { ...validBody, userId: undefined }],
    ['provider', { ...validBody, provider: undefined }],
    ['trackId', { ...validBody, trackId: undefined }],
    ['artist', { ...validBody, artist: undefined }],
    ['title', { ...validBody, title: undefined }],
  ])('returns 400 when %s is missing', async (field, body) => {
    const res = mockRes();
    await addExternalSound(mockReq({ body }), res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 400 for an invalid provider', async () => {
    const res = mockRes();
    await addExternalSound(mockReq({ body: { ...validBody, provider: 'napster' } }), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res._json.error).toMatch(/Invalid provider/);
  });

  it.each(['spotify', 'deezer', 'soundcloud'])('accepts valid provider: %s', async (provider) => {
    db.execute.mockResolvedValue({ lastID: 1 });
    db.queryOne.mockResolvedValue({ ...DB_ROW, provider, contexts: '[]' });
    const res = mockRes();
    await addExternalSound(mockReq({ body: { ...validBody, provider } }), res);
    expect(res.statusCode).toBe(201);
  });

  it('inserts with correct parameters and returns 201', async () => {
    db.execute.mockResolvedValue({ lastID: 99 });
    db.queryOne.mockResolvedValue({ ...DB_ROW, id: 99, contexts: '[["medium","combat"]]' });

    const res = mockRes();
    await addExternalSound(mockReq({ body: validBody }), res);

    expect(db.execute).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO external_sounds'),
      expect.arrayContaining([
        'user-abc',
        'spotify',
        'spotify-track-001',
        'Daft Punk',
        'One More Time',
      ])
    );
    expect(res.statusCode).toBe(201);
    expect(res._json).toMatchObject({
      id: 'ext_99',
      isExternal: true,
      filename: null,
    });
  });

  it('serialises contexts as JSON for storage', async () => {
    db.execute.mockResolvedValue({ lastID: 1 });
    db.queryOne.mockResolvedValue({ ...DB_ROW, contexts: '[["high","boss"]]' });
    const res = mockRes();
    await addExternalSound(mockReq({ body: { ...validBody, contexts: [['high', 'boss']] } }), res);

    const insertCall = db.execute.mock.calls[0];
    const contextsArg = insertCall[1][9]; // 10th param is contexts JSON
    expect(JSON.parse(contextsArg)).toEqual([['high', 'boss']]);
  });

  it('returns 409 on UNIQUE constraint violation', async () => {
    db.execute.mockRejectedValue(new Error('UNIQUE constraint failed: external_sounds.user_id'));
    const res = mockRes();
    await addExternalSound(mockReq({ body: validBody }), res);
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res._json.error).toMatch(/already in your playlist/);
  });

  it('returns 500 on other DB errors', async () => {
    db.execute.mockRejectedValue(new Error('Disk full'));
    const res = mockRes();
    await addExternalSound(mockReq({ body: validBody }), res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ─── deleteExternalSound ──────────────────────────────────────────────────────

describe('deleteExternalSound', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 400 when userId is missing', async () => {
    const res = mockRes();
    await deleteExternalSound(mockReq({ params: { id: '42' }, query: {} }), res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 404 when sound is not found / not owned', async () => {
    db.execute.mockResolvedValue({ changes: 0 });
    const res = mockRes();
    await deleteExternalSound(
      mockReq({ params: { id: '42' }, query: { userId: 'user-abc' } }),
      res
    );
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('deletes sound and returns { success: true }', async () => {
    db.execute.mockResolvedValue({ changes: 1 });
    const res = mockRes();
    await deleteExternalSound(
      mockReq({ params: { id: '42' }, query: { userId: 'user-abc' } }),
      res
    );

    expect(db.execute).toHaveBeenCalledWith(
      expect.stringContaining('DELETE FROM external_sounds'),
      ['42', 'user-abc']
    );
    expect(res._json).toEqual({ success: true });
  });

  it('passes correct userId from body as fallback', async () => {
    db.execute.mockResolvedValue({ changes: 1 });
    const res = mockRes();
    await deleteExternalSound(
      mockReq({ params: { id: '5' }, query: {}, body: { userId: 'user-body' } }),
      res
    );
    expect(db.execute).toHaveBeenCalledWith(expect.anything(), ['5', 'user-body']);
  });

  it('returns 500 on DB error', async () => {
    db.execute.mockRejectedValue(new Error('DB failure'));
    const res = mockRes();
    await deleteExternalSound(mockReq({ params: { id: '1' }, query: { userId: 'u1' } }), res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ─── updateExternalSound ──────────────────────────────────────────────────────

describe('updateExternalSound', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 400 when userId is missing', async () => {
    const res = mockRes();
    await updateExternalSound(mockReq({ params: { id: '42' }, body: {} }), res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 404 when sound is not found / not owned', async () => {
    db.queryOne.mockResolvedValue(null);
    const res = mockRes();
    await updateExternalSound(mockReq({ params: { id: '42' }, body: { userId: 'user-abc' } }), res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('updates contexts when provided', async () => {
    db.queryOne.mockResolvedValue(DB_ROW);
    db.execute.mockResolvedValue({ changes: 1 });
    const res = mockRes();
    await updateExternalSound(
      mockReq({ params: { id: '42' }, body: { userId: 'user-abc', contexts: [['high', 'boss']] } }),
      res
    );

    const updateCall = db.execute.mock.calls[0];
    expect(JSON.parse(updateCall[1][0])).toEqual([['high', 'boss']]);
    expect(res._json).toEqual({ success: true });
  });

  it('updates isEnabled when provided', async () => {
    db.queryOne.mockResolvedValue(DB_ROW);
    db.execute.mockResolvedValue({ changes: 1 });
    const res = mockRes();
    await updateExternalSound(
      mockReq({ params: { id: '42' }, body: { userId: 'user-abc', isEnabled: false } }),
      res
    );

    const updateCall = db.execute.mock.calls[0];
    expect(updateCall[1][1]).toBe(0); // is_enabled = 0
    expect(res._json).toEqual({ success: true });
  });

  it('preserves existing contexts when not provided', async () => {
    const existingContexts = '[["medium","ambient"]]';
    db.queryOne.mockResolvedValue({ ...DB_ROW, contexts: existingContexts });
    db.execute.mockResolvedValue({ changes: 1 });
    const res = mockRes();
    await updateExternalSound(
      mockReq({ params: { id: '42' }, body: { userId: 'user-abc', isEnabled: true } }),
      res
    );

    const updateCall = db.execute.mock.calls[0];
    expect(updateCall[1][0]).toBe(existingContexts); // contexts unchanged
  });

  it('returns 500 on DB error', async () => {
    db.queryOne.mockResolvedValue(DB_ROW);
    db.execute.mockRejectedValue(new Error('DB failure'));
    const res = mockRes();
    await updateExternalSound(
      mockReq({ params: { id: '42' }, body: { userId: 'user-abc', isEnabled: false } }),
      res
    );
    expect(res.status).toHaveBeenCalledWith(500);
  });
});
