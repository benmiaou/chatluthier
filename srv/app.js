const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('node:path');
const helmet = require('helmet');
const authRoutes = require('./routes/authRoutes');
const soundRoutes = require('./routes/soundRoutes');
const requestRoutes = require('./routes/requestRoutes');
const logger = require('./utils/logger');
const config = require('./config/appConfig');

const app = express();

// Validate required environment variables
const requiredEnvVars = ['NODE_ENV'];
if (config.backend.nodeEnv === 'production') {
  requiredEnvVars.push('VITE_API_BASE_URL');
}

const missingEnvVars = requiredEnvVars.filter((varName) => !process.env[varName]);
if (missingEnvVars.length > 0) {
  console.error(`❌ Missing required environment variables: ${missingEnvVars.join(', ')}`);
  if (config.backend.nodeEnv === 'production') {
    process.exit(1);
  }
}

// Note: CSP is handled by nginx in production, so we disable it here
// to avoid duplicate CSP headers. The nginx configuration includes
// the proper CSP header with correct syntax.
// app.use(helmet.contentSecurityPolicy({ directives: config.security.contentSecurityPolicy }));

// Add logging middleware
// Note: Winston logger doesn't have expressMiddleware method
// Using morgan or similar would be needed for HTTP request logging
// app.use(logger.expressMiddleware()); // Commented out as it causes errors
app.use(express.urlencoded({ limit: '100mb', extended: true }));
app.use(cookieParser());
app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);

      // Check if origin is in the allowed list
      if (config.security.cors.allowedOrigins.indexOf(origin) !== -1) {
        return callback(null, true);
      }

      // Origin not allowed - reject with error
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: config.security.cors.credentials,
    methods: config.security.cors.methods,
    allowedHeaders: config.security.cors.allowedHeaders,
  })
);
app.use(express.json({ limit: '100mb' }));
app.use(express.static(path.join(__dirname, '../dist')));
app.use('/assets', express.static(path.join(__dirname, '../dist/assets')));
app.use('/images', express.static(path.join(__dirname, '../dist/assets/images')));
app.use('/fonts', express.static(path.join(__dirname, '../dist/fonts')));
app.use('/css', express.static(path.join(__dirname, '../dist/css')));

// Handle preflight requests
app.options('*', (req, res) => {
  const origin = req.headers.origin;

  // Set CORS headers based on configuration
  if (origin && config.security.cors.allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Credentials', 'true');
  }

  res.header('Access-Control-Allow-Methods', config.security.cors.methods.join(', '));
  res.header('Access-Control-Allow-Headers', config.security.cors.allowedHeaders.join(', '));
  res.sendStatus(200);
});

app.use((req, res, next) => {
  const origin = req.headers.origin;

  // Set CORS headers based on configuration
  if (origin && config.security.cors.allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Credentials', 'true');
  }

  res.header('Access-Control-Allow-Methods', config.security.cors.methods.join(', '));
  res.header('Access-Control-Allow-Headers', config.security.cors.allowedHeaders.join(', '));
  next();
});

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
        code_verifier: code_verifier,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (tokenResponse.ok) {
      res.json({
        access_token: tokenData.access_token,
        token_type: tokenData.token_type,
        expires_in: tokenData.expires_in,
        refresh_token: tokenData.refresh_token,
        scope: tokenData.scope,
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

// Spotify token refresh endpoint
app.post('/api/spotify/refresh', async (req, res) => {
  try {
    const { refresh_token } = req.body;

    if (!refresh_token) {
      return res.status(400).json({ error: 'Missing refresh token' });
    }

    // Refresh the access token
    const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refresh_token,
        client_id: process.env.SPOTIFY_CLIENT_ID || 'e03effcac1d94e0ebe56813e98c815dc',
      }),
    });

    const tokenData = await tokenResponse.json();

    if (tokenResponse.ok) {
      res.json({
        access_token: tokenData.access_token,
        token_type: tokenData.token_type,
        expires_in: tokenData.expires_in,
        refresh_token: tokenData.refresh_token || refresh_token, // Use new refresh token if provided, otherwise keep old one
        scope: tokenData.scope,
      });
      console.log('Spotify token refresh successful');
    } else {
      console.error('Spotify token refresh error:', tokenData);
      res.status(400).json({ error: tokenData.error_description || 'Token refresh failed' });
    }
  } catch (error) {
    console.error('Error in Spotify token refresh:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// API routes must come before the catch-all route
app.use(authRoutes);
app.use(soundRoutes);
app.use(requestRoutes);

// SPA fallback — serve index.html for all non-API routes so React Router works
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

module.exports = app;
