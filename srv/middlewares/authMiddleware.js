const jwt = require('jsonwebtoken');
const { verifyjwt } = require('./authController');
const logger = require('../utils/logger');

async function authenticateToken(req, res, next) {
    const accessToken = req.cookies.accessToken;
    if (!accessToken) {
        logger.warn('Unauthorized access attempt - no token provided', {
            path: req.path,
            ip: req.ip || req.connection?.remoteAddress
        });
        return res.status(401).json({ error: 'Unauthorized' });
    }
    try {
        const payload = await verifyjwt(accessToken);
        req.user = payload;
        
        // Log successful authentication
        logger.access(payload.id, 'AUTHENTICATED', {
            path: req.path,
            ip: req.ip || req.connection?.remoteAddress,
            userAgent: req.headers['user-agent']
        });
        
        next();
    } catch (error) {
        logger.warn('Invalid token attempt', {
            error: error.message,
            path: req.path,
            ip: req.ip || req.connection?.remoteAddress
        });
        return res.status(401).json({ error: 'Unauthorized' });
    }
}

module.exports = {
    authenticateToken,
};
