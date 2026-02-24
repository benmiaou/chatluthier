const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const { accessTokenSecret, refreshTokenSecret } = require('../config/secret')();
const { isAdminUser } = require('../utils/tokenUtils');
const CLIENT_ID = '793652859374-lvh19kj1d49a33cola5ui3tsj1hsg2li.apps.googleusercontent.com';

const client = new OAuth2Client(CLIENT_ID);

// Database and filesystem imports for pseudo/password authentication
const db = require('../database/db');
const path = require('path');
const fs = require('fs');

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

        res.cookie('accessToken', accessToken, { 
          httpOnly: true, 
          secure: process.env.NODE_ENV === 'production',
          sameSite: process.env.NODE_ENV === 'production' ? 'lax' : 'none',
          maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
          path: '/',
          domain: process.env.NODE_ENV === 'production' ? undefined : 'localhost' 
        });
        res.cookie('refreshToken', refreshToken, { 
          httpOnly: true, 
          secure: process.env.NODE_ENV === 'production',
          sameSite: process.env.NODE_ENV === 'production' ? 'lax' : 'none',
          maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
          path: '/',
          domain: process.env.NODE_ENV === 'production' ? undefined : 'localhost' 
        });

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
        const accessToken = jwt.sign({ userId: payload.userId, email: payload.email, pseudo: payload.pseudo, isAdmin: payload.isAdmin }, accessTokenSecret, { expiresIn: '1h' });
        const newRefreshToken = jwt.sign({ userId: payload.userId, email: payload.email, pseudo: payload.pseudo, isAdmin: payload.isAdmin }, refreshTokenSecret, { expiresIn: '7d' });
        res.cookie('accessToken', accessToken, { 
          httpOnly: true, 
          secure: process.env.NODE_ENV === 'production',
          sameSite: process.env.NODE_ENV === 'production' ? 'lax' : 'none',
          maxAge: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
          path: '/',
          domain: process.env.NODE_ENV === 'production' ? undefined : 'localhost' 
        });
        res.cookie('refreshToken', newRefreshToken, { 
          httpOnly: true, 
          secure: process.env.NODE_ENV === 'production',
          sameSite: process.env.NODE_ENV === 'production' ? 'lax' : 'none',
          maxAge: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
          path: '/',
          domain: process.env.NODE_ENV === 'production' ? undefined : 'localhost' 
        });
        return res.json({ accessToken });
    } catch (error) {
        console.error('Refresh token verification failed:', error);
        return res.status(401).json({ error: 'Refresh token verification failed.' });
    }
}

function checkSession(req, res) {
    const accessToken = req.cookies.accessToken;
    console.log('checkSession called, accessToken present:', !!accessToken);
    if (!accessToken) {
        console.log('No access token found in cookies');
        return res.status(401).json({ isSignedIn: false });
    }
    try {
        const payload = jwt.verify(accessToken, accessTokenSecret);
        console.log('Session verified for user:', payload.userId);
        return res.json({
            isSignedIn: true,
            userId: payload.userId,
            email: payload.email,
            pseudo: payload.pseudo,
            isAdmin: payload.isAdmin || false,
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

// Pseudo/Password Authentication
const bcrypt = require('bcrypt');

async function registerWithPseudo(req, res) {
    try {
        const { pseudo, password, secretQuestion, secretAnswer } = req.body;
        
        // Validate input
        if (!pseudo || !password || !secretQuestion || !secretAnswer) {
            return res.status(400).json({ error: 'Pseudo, password, secret question, and secret answer are required' });
        }
        
        // Check if pseudo already exists (case-insensitive)
        const existingUser = await db.queryOne('SELECT id FROM users WHERE LOWER(pseudo) = LOWER(?)', [pseudo]);
        if (existingUser) {
            return res.status(409).json({ error: 'Pseudo already taken' });
        }
        
        // Hash password
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(password, saltRounds);
        const secretAnswerHash = await bcrypt.hash(secretAnswer, saltRounds);
        
        // Generate a user ID
        const userId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        
        // Insert user with secret question and answer
        await db.execute(
            'INSERT INTO users (id, pseudo, password_hash, secret_question, secret_answer_hash, is_admin) VALUES (?, ?, ?, ?, ?, ?)',
            [userId, pseudo, passwordHash, secretQuestion, secretAnswerHash, false]
        );
        
        // Create user directory
        const userDir = path.join(__dirname, '..', 'user_data', userId);
        if (!fs.existsSync(userDir)) {
            fs.mkdirSync(userDir, { recursive: true });
        }
        
        // Create initial preset file
        fs.writeFileSync(
            path.join(userDir, 'presets.json'),
            JSON.stringify({}, null, 2)
        );
        
        return res.status(201).json({
            success: true,
            userId,
            pseudo,
            message: 'Account created successfully'
        });
        
    } catch (error) {
        console.error('Registration error:', error);
        return res.status(500).json({ error: 'Registration failed' });
    }
}

async function requestPasswordReset(req, res) {
    try {
        const { pseudo, secretAnswer, newPassword } = req.body;
        
        // Validate input
        if (!pseudo || !secretAnswer || !newPassword) {
            return res.status(400).json({ error: 'Pseudo, secret answer, and new password are required' });
        }
        
        // Find user with secret question (case-insensitive)
        const user = await db.queryOne('SELECT id, password_hash, secret_question, secret_answer_hash FROM users WHERE LOWER(pseudo) = LOWER(?)', [pseudo]);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        // Verify secret answer
        const secretAnswerMatch = await bcrypt.compare(secretAnswer, user.secret_answer_hash);
        if (!secretAnswerMatch) {
            return res.status(401).json({ error: 'Invalid secret answer' });
        }
        
        // Hash new password
        const newPasswordHash = await bcrypt.hash(newPassword, 10);
        
        // Update password
        await db.execute(
            'UPDATE users SET password_hash = ? WHERE id = ?',
            [newPasswordHash, user.id]
        );
        
        return res.json({ success: true, message: 'Password reset successfully' });
        
    } catch (error) {
        console.error('Password reset error:', error);
        return res.status(500).json({ error: 'Password reset failed' });
    }
}

async function getSecretQuestion(req, res) {
    try {
        const { pseudo } = req.body;
        
        // Validate input
        if (!pseudo) {
            return res.status(400).json({ error: 'Pseudo is required' });
        }
        
        // Find user (case-insensitive)
        const user = await db.queryOne('SELECT secret_question FROM users WHERE LOWER(pseudo) = LOWER(?)', [pseudo]);
        if (!user || !user.secret_question) {
            return res.status(404).json({ error: 'User not found or no secret question set' });
        }
        
        return res.json({ success: true, secretQuestion: user.secret_question });
        
    } catch (error) {
        console.error('Get secret question error:', error);
        return res.status(500).json({ error: 'Failed to retrieve secret question' });
    }
}

async function checkPseudoAvailable(req, res) {
    try {
        const { pseudo } = req.body;
        
        // Validate input
        if (!pseudo || pseudo.trim() === '') {
            return res.status(400).json({ error: 'Pseudo is required' });
        }
        
        // Check if pseudo already exists (case-insensitive)
        const existingUser = await db.queryOne('SELECT id FROM users WHERE LOWER(pseudo) = LOWER(?)', [pseudo]);
        
        return res.json({ available: !existingUser });
        
    } catch (error) {
        console.error('Check pseudo availability error:', error);
        return res.status(500).json({ error: 'Failed to check pseudo availability' });
    }
}

async function loginWithPseudo(req, res) {
    try {
        const { pseudo, password } = req.body;
        
        // Find user (case-insensitive)
        const user = await db.queryOne('SELECT id, pseudo, password_hash, is_admin FROM users WHERE LOWER(pseudo) = LOWER(?)', [pseudo]);
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        // Verify password
        const passwordMatch = await bcrypt.compare(password, user.password_hash);
        if (!passwordMatch) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        // Generate JWT token
        const accessToken = jwt.sign({ userId: user.id, pseudo: user.pseudo, isAdmin: user.is_admin }, accessTokenSecret, { expiresIn: '1h' });
        const refreshToken = jwt.sign({ userId: user.id, pseudo: user.pseudo, isAdmin: user.is_admin }, refreshTokenSecret, { expiresIn: '7d' });
        
        console.log('Setting cookies for user:', user.id);
        console.log('Access token expires in: 24h');
        console.log('Refresh token expires in: 24h');
        
        res.cookie('accessToken', accessToken, { 
          httpOnly: true, 
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
          path: '/' 
        });
        res.cookie('refreshToken', refreshToken, { 
          httpOnly: true, 
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
          path: '/' 
        });
        
        return res.json({ userId: user.id, pseudo: user.pseudo, isAdmin: user.is_admin });
        
    } catch (error) {
        console.error('Login error:', error);
        return res.status(500).json({ error: 'Login failed' });
    }
}

async function changePassword(req, res) {
    try {
        const { userId, currentPassword, newPassword } = req.body;
        
        // Verify current password
        const user = await db.queryOne('SELECT password_hash FROM users WHERE id = ?', [userId]);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        const passwordMatch = await bcrypt.compare(currentPassword, user.password_hash);
        if (!passwordMatch) {
            return res.status(401).json({ error: 'Current password incorrect' });
        }
        
        // Hash new password
        const newPasswordHash = await bcrypt.hash(newPassword, 10);
        
        // Update password
        await db.execute(
            'UPDATE users SET password_hash = ? WHERE id = ?',
            [newPasswordHash, userId]
        );
        
        return res.json({ success: true, message: 'Password changed successfully' });
        
    } catch (error) {
        console.error('Change password error:', error);
        return res.status(500).json({ error: 'Password change failed' });
    }
}

module.exports = {
    verifyLogin,
    refreshToken,
    checkSession,
    logout,
    verifyjwt,
    registerWithPseudo,
    loginWithPseudo,
    changePassword,
    requestPasswordReset,
    getSecretQuestion,
    checkPseudoAvailable,
};