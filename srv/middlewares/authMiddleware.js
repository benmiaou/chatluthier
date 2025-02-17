const jwt = require('jsonwebtoken');
const { verifyjwt } = require('./authController');

async function authenticateToken(req, res, next) {
    const accessToken = req.cookies.accessToken;
    if (!accessToken) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    try {
        const payload = await verifyjwt(accessToken);
        req.user = payload;
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
}

module.exports = {
    authenticateToken,
};
