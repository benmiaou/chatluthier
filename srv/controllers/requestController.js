const { isAdminUser } = require('../utils/tokenUtils');
const { verifyjwt } = require('./authController');
const db = require('../database/db');

async function addSoundRequest(req, res) {
  const { category, file, contexts, soundUrl } = req.body;
  console.log('=== addSoundRequest called ===');
  console.log('Request body:', { category, file, contexts, soundUrl });
  console.log('Request cookies:', req.cookies);
  console.log('Request headers:', req.headers);

  if (!category || !file || !contexts) {
    console.log('Missing required fields');
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const accessToken = req.cookies.accessToken;
    console.log('Access token from cookies:', accessToken);

    if (!accessToken) {
      console.log('No access token found in cookies');
      return res.status(400).json({ error: 'Missing ID token' });
    }

    console.log('Verifying JWT token...');
    const payload = await verifyjwt(accessToken);
    console.log('JWT payload:', payload);

    // Handle both email and pseudo-based authentication
    const email = payload.email || payload.pseudo;
    console.log('Extracted email/pseudo:', email);

    console.log('Inserting into database...');
    // Insert into database
    await db.execute(
      `INSERT INTO sound_requests (category, file, contexts, sound_url, requested_by, status) 
             VALUES (?, ?, ?, ?, ?, ?)`,
      [category, file, JSON.stringify(contexts), soundUrl, email, 'pending']
    );

    console.log('Request added successfully');
    res.status(201).json({ message: 'Sound request added successfully' });
  } catch (error) {
    console.error('Error adding sound request:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

async function getRequests(req, res) {
  console.log('=== getRequests called ===');
  console.log('Request cookies:', req.cookies);

  const accessToken = req.cookies.accessToken;
  if (!accessToken) {
    console.log('No access token found in cookies');
    return res.status(400).json({ error: 'Missing ID token' });
  }

  try {
    console.log('Verifying JWT token for admin access...');
    const payload = await verifyjwt(accessToken);
    console.log('JWT payload:', payload);

    // Handle both email and pseudo-based authentication
    const email = payload.email || payload.pseudo;
    console.log('User email/pseudo:', email);

    const isAdmin = isAdminUser(email, payload);
    console.log('Is admin:', isAdmin);

    if (!isAdmin) {
      console.log('User is not admin - access denied');
      return res.status(403).json({ error: 'Unauthorized' });
    }

    console.log('Fetching all requests from database...');
    // Get all requests from database
    const requests = await db.query(`SELECT * FROM sound_requests ORDER BY created_at DESC`);
    console.log(`Found ${requests.length} requests`);

    res.json(requests);
  } catch (error) {
    console.error('Error getting sound requests:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

async function closeRequest(req, res) {
  const { requestId } = req.body;
  const accessToken = req.cookies.accessToken;
  if (!accessToken || !requestId) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const payload = await verifyjwt(accessToken);
    // Handle both email and pseudo-based authentication
    const email = payload.email || payload.pseudo;
    const isAdmin = isAdminUser(email, payload);

    if (!isAdmin) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Update request status to closed
    await db.execute(`UPDATE sound_requests SET status = 'closed' WHERE id = ?`, [requestId]);

    res.status(200).json({ message: 'Request closed successfully' });
  } catch (error) {
    console.error('Error closing sound request:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

module.exports = {
  addSoundRequest,
  getRequests,
  closeRequest,
};
