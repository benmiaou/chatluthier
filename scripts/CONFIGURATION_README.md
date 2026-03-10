# Dev Server Configuration Guide

This guide explains how to configure the dev server without requiring environment variables to be exported.

## Overview

The application now uses a configuration system that:

1. **Doesn't require exporting environment variables** - All configuration is read from `.env` file or uses sensible defaults
2. **Supports multiple dev servers** - CORS is configured to allow multiple origins in development
3. **Uses relative paths by default** - No need to configure `VITE_API_BASE_URL` for development
4. **Provides a configuration script** - Easy management of server settings

## Configuration Files

### `.env` File

The `.env` file contains environment-specific configuration. This file should NOT be committed to version control (it's in `.gitignore`).

Example `.env` file:

```env
# Spotify OAuth PKCE (client-side, safe to expose)
VITE_SPOTIFY_CLIENT_ID=e03effcac1d94e0ebe56813e98c815dc
VITE_SPOTIFY_REDIRECT_URI_LOCAL=http://127.0.0.1:3000
VITE_SPOTIFY_REDIRECT_URI_PROD=https://chatluthier.org

# Google OAuth
VITE_GOOGLE_CLIENT_ID=793652859374-lvh19kj1d49a33cola5ui3tsj1hsg2li.apps.googleusercontent.com

# Optional: Set a different port for the backend server
# PORT=3001

# Optional: Set API base URL (usually not needed for development)
# VITE_API_BASE_URL=http://localhost:3000
```

### Configuration Script

A configuration script is provided to manage server settings:

```bash
node scripts/configureDevServer.js [options]
```

**Available Options:**

- `--help, -h` - Show help message
- `--show-config` - Show current configuration
- `--set-port <port>` - Set the server port
- `--add-origin <url>` - Add an allowed origin URL
- `--list-origins` - List current allowed origins

**Examples:**

```bash
# Show current configuration
node scripts/configureDevServer.js --show-config

# Set server port to 3001
node scripts/configureDevServer.js --set-port 3001

# Add a new allowed origin
node scripts/configureDevServer.js --add-origin https://mydevserver:4000

# List allowed origins
node scripts/configureDevServer.js --list-origins
```

## Development vs Production Configuration

### Development Mode (Default)

- **API Base URL**: Uses relative paths (empty string)
- **WebSocket Host**: Uses `window.location.hostname`
- **CORS**: Allows all origins (for development flexibility)
- **Port**: 3000 (or as configured in `.env`)

### Production Mode

Set `NODE_ENV=production` in your `.env` file:

```env
NODE_ENV=production
```

In production:

- **CORS**: Only allows explicitly listed origins
- **API Base URL**: Should be set to the full production URL
- **WebSocket Host**: Should be set to the production WebSocket host

## Running Multiple Dev Servers

The configuration supports running multiple dev servers on the same machine:

1. **Set different ports** for each server instance
2. **Add each server's origin** to the allowed origins list
3. **Use relative paths** for API calls (no need for `VITE_API_BASE_URL`)

Example for two dev servers:

**Server 1 (Port 3000):**

```bash
# In .env
PORT=3000

# Start server
node srv/server.js
```

**Server 2 (Port 3001):**

```bash
# Add the second server's origin
node scripts/configureDevServer.js --add-origin http://localhost:3001

# Set port for second server
node scripts/configureDevServer.js --set-port 3001

# Start second server (you'll need to modify the start script or use a different approach)
PORT=3001 node srv/server.js
```

## CORS Configuration

The server is configured with flexible CORS settings:

- **Development**: All origins are allowed
- **Production**: Only explicitly listed origins are allowed

Default allowed origins:

- `http://localhost:5173` (Vite dev server)
- `http://localhost:3000` (Backend server)
- `https://dev.chatluthier.org:4000` (Dev server)
- `https://chatluthier.org` (Production server)

## Environment Variables Reference

| Variable            | Purpose                | Required | Default                  |
| ------------------- | ---------------------- | -------- | ------------------------ |
| `VITE_API_BASE_URL` | Base URL for API calls | No       | '' (relative paths)      |
| `VITE_WS_HOST`      | WebSocket host         | No       | window.location.hostname |
| `PORT`              | Backend server port    | No       | 3000                     |
| `NODE_ENV`          | Environment mode       | No       | 'development'            |
| `LOG_LEVEL`         | Logging level          | No       | 'info'                   |

## Best Practices

1. **Don't export environment variables** - Use the `.env` file instead
2. **Use relative paths in development** - No need to set `VITE_API_BASE_URL`
3. **Add custom origins** - Use the configuration script to add allowed origins
4. **Keep secrets secure** - Never commit `.env` files to version control
5. **Use different ports** - When running multiple server instances

## Troubleshooting

**Issue: CORS errors in development**

- Solution: Make sure you're running in development mode (`NODE_ENV=development`) or add your origin to the allowed list

**Issue: API calls not working**

- Solution: Use relative paths (don't set `VITE_API_BASE_URL`) or ensure the URL is correct

**Issue: Configuration changes not taking effect**

- Solution: Restart your server after making configuration changes
