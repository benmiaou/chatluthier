const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const authRoutes = require('./routes/authRoutes');
const soundRoutes = require('./routes/soundRoutes');
const requestRoutes = require('./routes/requestRoutes');

const app = express();
app.use(express.urlencoded({ limit: '100mb', extended: true }));
app.use(cookieParser());
app.use(cors());
app.use(express.json({ limit: '100mb' }));
app.use(express.static(path.join(__dirname, '../dist')));
app.use('/assets', express.static(path.join(__dirname, '../assets')));

app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, PUT, POST, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With');
    next();
});

app.use(authRoutes);
app.use(soundRoutes);
app.use(requestRoutes);

// Spotify PKCE token exchange endpoint
app.post('/api/spotify/token', async (req, res) => {
    try {
        const { code, code_verifier, redirect_uri } = req.body;
        
        if (!code || !code_verifier || !redirect_uri) {
            return res.status(400).json({ error: 'Missing required parameters' });
        }
        
        // Exchange authorization code for access token
        const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                grant_type: 'authorization_code',
                code: code,
                redirect_uri: redirect_uri,
                client_id: process.env.SPOTIFY_CLIENT_ID || 'e03effcac1d94e0ebe56813e98c815dc',
                code_verifier: code_verifier
            })
        });
        
        const tokenData = await tokenResponse.json();
        
        if (tokenResponse.ok) {
            res.json({
                access_token: tokenData.access_token,
                token_type: tokenData.token_type,
                expires_in: tokenData.expires_in,
                refresh_token: tokenData.refresh_token,
                scope: tokenData.scope
            });
            console.log('Spotify token exchange successful');
        } else {
            console.error('Spotify token exchange error:', tokenData);
            res.status(400).json({ error: tokenData.error_description || 'Token exchange failed' });
        }
        
    } catch (error) {
        console.error('Error in Spotify token exchange:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});



module.exports = app;
