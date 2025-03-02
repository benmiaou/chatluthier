const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const { accessTokenSecret, refreshTokenSecret } = require('../config/secret')();
const { isAdminUser } = require('../utils/tokenUtils');
const CLIENT_ID = '793652859374-lvh19kj1d49a33cola5ui3tsj1hsg2li.apps.googleusercontent.com';

const client = new OAuth2Client(CLIENT_ID);

async function verifyIdToken(token) {
    const ticket = await client.verifyIdToken({
        idToken: token,
        audience: CLIENT_ID,
    });
    return ticket.getPayload();
}

async function verifyjwt(accessToken) {
    return jwt.verify(accessToken, accessTokenSecret);
}

async function verifyLogin(req, res) {
    const { idToken } = req.body;
    if (!idToken) {
        return res.status(400).json({ error: 'No ID token provided.' });
    }
    try {
        const payload = await verifyIdToken(idToken);
        const userId = payload.sub;
        const email = payload.email;
        const isAdmin = isAdminUser(email);

        const accessToken = jwt.sign({ userId, email, isAdmin }, accessTokenSecret, { expiresIn: '1h' });
        const refreshToken = jwt.sign({ userId, email, isAdmin }, refreshTokenSecret, { expiresIn: '7d' });

        res.cookie('accessToken', accessToken, { httpOnly: true, secure: true });
        res.cookie('refreshToken', refreshToken, { httpOnly: true, secure: true });

        return res.json({ userId, email, isAdmin });
    } catch (error) {
        console.error('Token verification failed:', error);
        return res.status(401).json({ error: 'Token verification failed.' });
    }
}

function refreshToken(req, res) {
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) {
        return res.status(401).json({ error: 'No refresh token provided.' });
    }
    try {
        const payload = jwt.verify(refreshToken, refreshTokenSecret);
        const accessToken = jwt.sign({ userId: payload.userId, email: payload.email, isAdmin: payload.isAdmin }, accessTokenSecret, { expiresIn: '1h' });
        res.cookie('accessToken', accessToken, { httpOnly: true, secure: true });
        return res.json({ accessToken });
    } catch (error) {
        console.error('Refresh token verification failed:', error);
        return res.status(401).json({ error: 'Refresh token verification failed.' });
    }
}

function checkSession(req, res) {
    console.log(req)
    const accessToken = req.cookies.accessToken;
    if (!accessToken) {
        return res.status(401).json({ isSignedIn: false });
    }
    try {
        const payload = jwt.verify(accessToken, accessTokenSecret);
        return res.json({
            isSignedIn: true,
            userId: payload.userId,
            email: payload.email,
            isAdmin: payload.isAdmin,
        });
    } catch (error) {
        console.error('Session verification failed:', error);
        return res.status(401).json({ isSignedIn: false });
    }
}

function logout(req, res) {
    res.clearCookie('accessToken', { httpOnly: true, secure: true });
    res.clearCookie('refreshToken', { httpOnly: true, secure: true });
    return res.json({ message: 'Logged out successfully' });
}

module.exports = {
    verifyLogin,
    refreshToken,
    checkSession,
    logout,
    verifyjwt,
};