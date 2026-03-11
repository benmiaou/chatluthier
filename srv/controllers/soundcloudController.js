/**
 * SoundCloud Controller
 *
 * SoundCloud uses OAuth2 authorization code + PKCE flow.
 * POST /api/soundcloud/token  — exchange authorization code for access token
 * GET  /api/soundcloud/search — proxy search to SoundCloud API
 *
 * Requires env var: SOUNDCLOUD_CLIENT_ID, SOUNDCLOUD_CLIENT_SECRET
 */

const SOUNDCLOUD_CLIENT_ID = process.env.SOUNDCLOUD_CLIENT_ID;
const SOUNDCLOUD_CLIENT_SECRET = process.env.SOUNDCLOUD_CLIENT_SECRET;
const SOUNDCLOUD_API_BASE = 'https://api.soundcloud.com';

/**
 * POST /api/soundcloud/token
 * Body: { code, code_verifier, redirect_uri }
 */
async function exchangeToken(req, res) {
  const { code, code_verifier, redirect_uri } = req.body;

  if (!code || !redirect_uri) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }

  if (!SOUNDCLOUD_CLIENT_ID || !SOUNDCLOUD_CLIENT_SECRET) {
    return res.status(503).json({ error: 'SoundCloud integration not configured' });
  }

  try {
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: SOUNDCLOUD_CLIENT_ID,
      client_secret: SOUNDCLOUD_CLIENT_SECRET,
      redirect_uri,
      code,
    });

    if (code_verifier) {
      body.set('code_verifier', code_verifier);
    }

    const response = await fetch('https://secure.soundcloud.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json; charset=utf-8' },
      body,
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('SoundCloud token exchange error:', data);
      return res.status(400).json({ error: data.error_description || 'Token exchange failed' });
    }

    return res.json({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_in: data.expires_in,
      token_type: data.token_type,
    });
  } catch (error) {
    console.error('SoundCloud token exchange error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * POST /api/soundcloud/refresh
 * Body: { refresh_token }
 */
async function refreshToken(req, res) {
  const { refresh_token } = req.body;

  if (!refresh_token) {
    return res.status(400).json({ error: 'Missing refresh_token' });
  }

  if (!SOUNDCLOUD_CLIENT_ID || !SOUNDCLOUD_CLIENT_SECRET) {
    return res.status(503).json({ error: 'SoundCloud integration not configured' });
  }

  try {
    const response = await fetch('https://secure.soundcloud.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json; charset=utf-8' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: SOUNDCLOUD_CLIENT_ID,
        client_secret: SOUNDCLOUD_CLIENT_SECRET,
        refresh_token,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(400).json({ error: data.error_description || 'Token refresh failed' });
    }

    return res.json({
      access_token: data.access_token,
      refresh_token: data.refresh_token || refresh_token,
      expires_in: data.expires_in,
      token_type: data.token_type,
    });
  } catch (error) {
    console.error('SoundCloud refresh error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * GET /api/soundcloud/search?q=query&limit=20
 * Requires Authorization header: Bearer <access_token>
 */
async function search(req, res) {
  const { q, limit = 20 } = req.query;
  const authHeader = req.headers.authorization;

  if (!q) {
    return res.status(400).json({ error: 'Missing search query' });
  }

  // SoundCloud search works with client_id for public tracks even without auth
  const clientId = SOUNDCLOUD_CLIENT_ID;

  try {
    const url = new URL(`${SOUNDCLOUD_API_BASE}/tracks`);
    url.searchParams.set('q', q);
    url.searchParams.set('limit', String(limit));
    url.searchParams.set('format', 'json');
    if (clientId && !authHeader) {
      url.searchParams.set('client_id', clientId);
    }

    const headers = { Accept: 'application/json; charset=utf-8' };
    if (authHeader) {
      headers['Authorization'] = authHeader;
    }

    const response = await fetch(url.toString(), { headers });

    if (!response.ok) {
      return res.status(response.status).json({ error: 'SoundCloud search failed' });
    }

    const data = await response.json();
    const collection = Array.isArray(data) ? data : (data.collection || []);

    const results = collection.map((track) => ({
      trackId: String(track.id),
      title: track.title || '',
      artist: track.user?.username || '',
      album: '',
      durationMs: track.duration || 0,
      thumbnailUrl: track.artwork_url?.replace('-large', '-t300x300') || '',
      previewUrl: track.stream_url
        ? `${track.stream_url}?client_id=${clientId}`
        : (track.permalink_url || ''),
      streamUrl: track.stream_url || '',
      permalinkUrl: track.permalink_url || '',
      provider: 'soundcloud',
    }));

    return res.json({ results });
  } catch (error) {
    console.error('SoundCloud search error:', error);
    return res.status(500).json({ error: 'Failed to search SoundCloud' });
  }
}

module.exports = { exchangeToken, refreshToken, search };
