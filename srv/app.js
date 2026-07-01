const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const path = require('node:path');
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

// CSP is handled by nginx in production — disable it in helmet to avoid duplicate headers.
// All other helmet headers (X-Content-Type-Options, X-Frame-Options, Referrer-Policy, etc.) are enabled.
app.use(helmet({ contentSecurityPolicy: false }));
app.disable('x-powered-by');

// Add logging middleware
// Note: Winston logger doesn't have expressMiddleware method
// Using morgan or similar would be needed for HTTP request logging
// app.use(logger.expressMiddleware()); // Commented out as it causes errors
app.use(express.urlencoded({ limit: '100mb', extended: true }));
app.use(cookieParser());
app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);

      // In development, allow any localhost origin regardless of port
      if (process.env.NODE_ENV !== 'production' && /^https?:\/\/localhost(:\d+)?$/.test(origin)) {
        return callback(null, true);
      }

      if (config.security.cors.allowedOrigins.indexOf(origin) !== -1) {
        return callback(null, true);
      }

      return callback(new Error('Not allowed by CORS'));
    },
    credentials: config.security.cors.credentials,
    methods: config.security.cors.methods,
    allowedHeaders: config.security.cors.allowedHeaders,
  })
);
app.use(express.json({ limit: '100mb' }));
app.use(express.static(path.join(__dirname, '../dist')));
app.use('/assets', express.static(path.join(__dirname, '../srv_sound_data')));
app.use('/assets', express.static(path.join(__dirname, '../dist/assets')));
app.use('/images', express.static(path.join(__dirname, '../dist/images')));
app.use('/fonts', express.static(path.join(__dirname, '../dist/fonts')));

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

// API routes must come before the catch-all route
app.use(authRoutes);
app.use(soundRoutes);
app.use(requestRoutes);

// SPA fallback — serve index.html for all non-API routes so React Router works
app.get('*', (req, res) => {
  // Don't serve index.html for API routes
  if (
    req.path.startsWith('/api/') ||
    req.path.startsWith('/backgroundMusic') ||
    req.path.startsWith('/ambianceSounds') ||
    req.path.startsWith('/soundboard')
  ) {
    return res.status(404).json({ error: 'Not found' });
  }
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

module.exports = app;
