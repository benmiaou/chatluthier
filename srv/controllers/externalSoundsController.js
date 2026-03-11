const db = require('../database/db');

/**
 * GET /external-sounds?userId=X
 * Returns all external sounds for a user, formatted like background_sounds entries.
 */
async function getExternalSounds(req, res) {
  const userId = req.query.userId || req.headers['user-id'];
  if (!userId) {
    return res.status(400).json({ error: 'Missing userId' });
  }

  try {
    const rows = await db.query(
      `SELECT * FROM external_sounds WHERE user_id = ? ORDER BY created_at DESC`,
      [userId]
    );

    const sounds = rows.map((row) => ({
      id: `ext_${row.id}`,
      dbId: row.id,
      filename: null,
      display_name: `${row.artist} – ${row.title}`,
      imageFile: row.thumbnail_url,
      credit: row.artist,
      contexts: row.contexts ? JSON.parse(row.contexts) : [],
      isEnabled: Boolean(row.is_enabled),
      isExternal: true,
      provider: row.provider,
      providerTrackId: row.provider_track_id,
      artist: row.artist,
      title: row.title,
      album: row.album,
      durationMs: row.duration_ms,
      thumbnailUrl: row.thumbnail_url,
      previewUrl: row.preview_url,
    }));

    return res.json(sounds);
  } catch (error) {
    console.error('Error fetching external sounds:', error);
    return res.status(500).json({ error: 'Failed to fetch external sounds' });
  }
}

/**
 * POST /external-sounds
 * Add a new external sound for a user.
 * Body: { userId, provider, trackId, artist, title, album, durationMs, thumbnailUrl, previewUrl, contexts }
 */
async function addExternalSound(req, res) {
  const {
    userId,
    provider,
    trackId,
    artist,
    title,
    album,
    durationMs,
    thumbnailUrl,
    previewUrl,
    contexts,
  } = req.body;

  if (!userId || !provider || !trackId || !artist || !title) {
    return res
      .status(400)
      .json({ error: 'Missing required fields: userId, provider, trackId, artist, title' });
  }

  const validProviders = ['spotify', 'deezer', 'soundcloud'];
  if (!validProviders.includes(provider)) {
    return res
      .status(400)
      .json({ error: 'Invalid provider. Must be spotify, deezer, or soundcloud' });
  }

  try {
    const contextsJson = contexts ? JSON.stringify(contexts) : '[]';
    const result = await db.execute(
      `INSERT INTO external_sounds
        (user_id, provider, provider_track_id, artist, title, album, duration_ms, thumbnail_url, preview_url, contexts)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        provider,
        trackId,
        artist,
        title,
        album || null,
        durationMs || null,
        thumbnailUrl || null,
        previewUrl || null,
        contextsJson,
      ]
    );

    const inserted = await db.queryOne('SELECT * FROM external_sounds WHERE id = ?', [
      result.lastID,
    ]);
    return res.status(201).json({
      id: `ext_${inserted.id}`,
      dbId: inserted.id,
      filename: null,
      display_name: `${inserted.artist} – ${inserted.title}`,
      imageFile: inserted.thumbnail_url,
      credit: inserted.artist,
      contexts: JSON.parse(inserted.contexts || '[]'),
      isEnabled: true,
      isExternal: true,
      provider: inserted.provider,
      providerTrackId: inserted.provider_track_id,
      artist: inserted.artist,
      title: inserted.title,
      album: inserted.album,
      durationMs: inserted.duration_ms,
      thumbnailUrl: inserted.thumbnail_url,
      previewUrl: inserted.preview_url,
    });
  } catch (error) {
    if (error.message && error.message.includes('UNIQUE constraint failed')) {
      return res.status(409).json({ error: 'This track is already in your playlist' });
    }
    console.error('Error adding external sound:', error);
    return res.status(500).json({ error: 'Failed to add external sound' });
  }
}

/**
 * DELETE /external-sounds/:id
 * Remove an external sound by its DB id.
 */
async function deleteExternalSound(req, res) {
  const { id } = req.params;
  const userId = req.query.userId || req.body.userId;

  if (!userId) {
    return res.status(400).json({ error: 'Missing userId' });
  }

  try {
    const result = await db.execute('DELETE FROM external_sounds WHERE id = ? AND user_id = ?', [
      id,
      userId,
    ]);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'External sound not found or not owned by this user' });
    }

    return res.json({ success: true });
  } catch (error) {
    console.error('Error deleting external sound:', error);
    return res.status(500).json({ error: 'Failed to delete external sound' });
  }
}

/**
 * PATCH /external-sounds/:id
 * Update contexts or is_enabled for an external sound.
 * Body: { userId, contexts?, isEnabled? }
 */
async function updateExternalSound(req, res) {
  const { id } = req.params;
  const { userId, contexts, isEnabled } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'Missing userId' });
  }

  try {
    const existing = await db.queryOne(
      'SELECT * FROM external_sounds WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    if (!existing) {
      return res.status(404).json({ error: 'External sound not found or not owned by this user' });
    }

    const newContexts = contexts !== undefined ? JSON.stringify(contexts) : existing.contexts;
    const newEnabled = isEnabled !== undefined ? (isEnabled ? 1 : 0) : existing.is_enabled;

    await db.execute(
      'UPDATE external_sounds SET contexts = ?, is_enabled = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [newContexts, newEnabled, id]
    );

    return res.json({ success: true });
  } catch (error) {
    console.error('Error updating external sound:', error);
    return res.status(500).json({ error: 'Failed to update external sound' });
  }
}

module.exports = {
  getExternalSounds,
  addExternalSound,
  deleteExternalSound,
  updateExternalSound,
};
