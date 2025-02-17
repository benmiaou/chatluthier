const fs = require('fs');
const path = require('path');
const { verifyIdToken } = require('./authController');
const { isAdminUser } = require('../utils/tokenUtils');

const requestsDir = path.join(__dirname, '..', 'requests');
const requestsFile = path.join(requestsDir, 'requests.json');

if (!fs.existsSync(requestsDir)) {
    fs.mkdirSync(requestsDir, { recursive: true });
}

if (!fs.existsSync(requestsFile)) {
    fs.writeFileSync(requestsFile, JSON.stringify([]), 'utf8');
}

async function addSoundRequest(req, res) {
    const { category, file, contexts } = req.body;
    if (!category || !file || !contexts) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    let requests = [];
    try {
        const data = fs.readFileSync(requestsFile, 'utf8');
        requests = JSON.parse(data);
    } catch (error) {
        console.error('Error reading requests file:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }

    const newRequest = {
        category,
        file,
        contexts,
        timestamp: new Date().toISOString()
    };

    requests.push(newRequest);

    try {
        fs.writeFileSync(requestsFile, JSON.stringify(requests, null, 2), 'utf8');
        res.status(201).json({ message: 'Sound request added successfully' });
    } catch (error) {
        console.error('Error writing to requests file:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

async function getRequests(req, res) {
    const idToken = req.headers.authorization?.split(' ')[1];
    if (!idToken) {
        return res.status(400).json({ error: 'Missing ID token' });
    }

    try {
        const payload = await verifyIdToken(idToken);
        const isAdmin = isAdminUser(payload);

        if (!isAdmin) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        let requests = [];
        try {
            const data = fs.readFileSync(requestsFile, 'utf8');
            requests = JSON.parse(data);
        } catch (error) {
            console.error('Error reading requests file:', error);
            return res.status(500).json({ error: 'Internal Server Error' });
        }

        res.json(requests);
    } catch (error) {
        console.error('Error verifying ID token:', error);
        res.status(401).json({ error: 'Invalid ID token' });
    }
}

async function closeRequest(req, res) {
    const { idToken, requestId } = req.body;
    if (!idToken || !requestId) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        const payload = await verifyIdToken(idToken);
        const isAdmin = isAdminUser(payload);

        if (!isAdmin) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        let requests = [];
        try {
            const data = fs.readFileSync(requestsFile, 'utf8');
            requests = JSON.parse(data);
        } catch (error) {
            console.error('Error reading requests file:', error);
            return res.status(500).json({ error: 'Internal Server Error' });
        }

        requests = requests.filter(request => request.timestamp !== requestId);

        try {
            fs.writeFileSync(requestsFile, JSON.stringify(requests, null, 2), 'utf8');
            res.status(200).json({ message: 'Request removed successfully' });
        } catch (error) {
            console.error('Error writing to requests file:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    } catch (error) {
        console.error('Error verifying ID token:', error);
        res.status(401).json({ error: 'Invalid ID token' });
    }
}

module.exports = {
    addSoundRequest,
    getRequests,
    closeRequest,
};
