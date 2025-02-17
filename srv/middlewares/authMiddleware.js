const jwt = require('jsonwebtoken');
const { accessTokenSecret } = require('./config/secrets')();

function authenticateToken(req, res, next) {
    const accessToken = req.cookies.accessToken;
    if (!accessToken) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    try {
        const payload = jwt.verify(accessToken, accessTokenSecret);
        req.user = payload;
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
}

module.exports = {
    authenticateToken,
};
