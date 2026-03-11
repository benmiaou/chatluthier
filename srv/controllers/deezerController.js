/**
 * Deezer Controller
 *
 * Deezer uses an implicit grant flow handled entirely on the frontend via their JS SDK.
 * The backend only provides a search proxy so the API request goes server-side.
 * Deezer's public search API is CORS-enabled, so a proxy is optional but keeps
 * the client_id server-side and avoids exposing it in JS bundles.
 *
 * GET /api/deezer/search?q=query&limit=20
 */
async function search(req, res) {
  const { q, limit = 20 } = req.query;

  if (!q) {
    return res.status(400).json({ error: 'Missing search query' });
  }

  try {
    const url = `https://api.deezer.com/search?q=${encodeURIComponent(q)}&limit=${limit}&output=json`;
    const response = await fetch(url);

    if (!response.ok) {
      return res.status(response.status).json({ error: 'Deezer search failed' });
    }

    const data = await response.json();

    // Normalize to our common search result format
    const results = (data.data || []).map((track) => ({
      trackId: String(track.id),
      title: track.title,
      artist: track.artist?.name || '',
      album: track.album?.title || '',
      durationMs: (track.duration || 0) * 1000,
      thumbnailUrl: track.album?.cover_medium || track.album?.cover || '',
      previewUrl: track.preview || '',
      provider: 'deezer',
    }));

    return res.json({ results });
  } catch (error) {
    console.error('Deezer search error:', error);
    return res.status(500).json({ error: 'Failed to search Deezer' });
  }
}

module.exports = { search };
