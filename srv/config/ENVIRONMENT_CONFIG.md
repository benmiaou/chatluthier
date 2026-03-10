# Environment Configuration Guide

This guide explains how to configure the server for different environments (local development, dev server, production).

## Configuration Files

### `srv/config/appConfig.js`

This is the main configuration file that contains all security and server settings.

### `.env`

Environment-specific variables. **Never commit this file to version control.**

## Environment-Specific Configurations

### 1. Local Development (Default)

**Configuration:**

```javascript
// In appConfig.js - already set for local development
security: {
  cors: {
    allowedOrigins: [
      'http://localhost:5173',  // Vite dev server
      'http://localhost:3000',  // Local backend
    ],
    credentials: true,
    methods: ['GET', 'PUT', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Content-Length', 'X-Requested-With']
  }
}
```

**`.env` file:**

```env
# Local development - no special configuration needed
# Uses relative paths for API calls
# VITE_API_BASE_URL= (empty for relative paths)
# VITE_WS_HOST= (empty for default)
NODE_ENV=development
```

### 2. Dev Server (dev.chatluthier.org:4000)

**Configuration:**

```javascript
// In appConfig.js - update for dev server
security: {
  cors: {
    allowedOrigins: [
      'https://dev.chatluthier.org:4000',  // Dev server frontend
      'https://chatluthier.org',           // Main site (if needed)
    ],
    credentials: true,
    methods: ['GET', 'PUT', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Content-Length', 'X-Requested-With']
  }
}
```

**`.env` file:**

```env
# Dev server configuration
VITE_API_BASE_URL=https://dev.chatluthier.org:4000
# VITE_WS_HOST=dev.chatluthier.org
NODE_ENV=production
```

### 3. Production Server (chatluthier.org)

**Configuration:**

```javascript
// In appConfig.js - update for production
security: {
  cors: {
    allowedOrigins: [
      'https://chatluthier.org',  // Production site only
      # Add other production domains if needed
    ],
    credentials: true,
    methods: ['GET', 'PUT', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Content-Length', 'X-Requested-With']
  }
}
```

**`.env` file:**

```env
# Production configuration
VITE_API_BASE_URL=https://chatluthier.org
# VITE_WS_HOST=chatluthier.org
NODE_ENV=production
```

## Deployment Process

### For Dev Server

1. **Update configuration** in `srv/config/appConfig.js`
2. **Update `.env`** with dev server settings
3. **Deploy** using the deployment script
4. **Restart** the server

### For Production Server

1. **Update configuration** in `srv/config/appConfig.js`
2. **Update `.env`** with production settings
3. **Test locally** before deploying
4. **Deploy** using the production deployment script
5. **Restart** the server

## Security Best Practices

1. **Never use "allow all" in CORS** - Always specify exact allowed origins
2. **Keep `.env` files secure** - Never commit to version control
3. **Use HTTPS in production** - All production origins should use HTTPS
4. **Minimize allowed origins** - Only include domains that absolutely need access
5. **Test CORS configuration** - Verify that only allowed domains can access your API

## Troubleshooting

### CORS Errors

If you get CORS errors:

1. Check that the origin is in `allowedOrigins`
2. Verify the `.env` file has correct settings
3. Ensure `NODE_ENV` is set correctly
4. Check browser console for exact error details

### CSP Errors

If you get CSP errors:

1. Check the CSP configuration in `appConfig.js`
2. Verify the domain is in the correct CSP directive
3. Check browser console for the exact violated directive
4. Test changes locally before deploying

## Configuration Validation

To validate your configuration:

```bash
# Check current configuration
node -e "const config = require('./srv/config/appConfig'); console.log(JSON.stringify(config.security.cors, null, 2))"

# Test CORS locally
curl -I -X OPTIONS http://localhost:3000 -H "Origin: http://localhost:5173"
```

## Environment Variables Reference

| Variable            | Purpose          | Local         | Dev Server                         | Production                |
| ------------------- | ---------------- | ------------- | ---------------------------------- | ------------------------- |
| `NODE_ENV`          | Environment mode | `development` | `production`                       | `production`              |
| `VITE_API_BASE_URL` | API base URL     | (empty)       | `https://dev.chatluthier.org:4000` | `https://chatluthier.org` |
| `VITE_WS_HOST`      | WebSocket host   | (empty)       | `dev.chatluthier.org`              | `chatluthier.org`         |

## Important Notes

1. **Configuration is code** - Treat configuration files with the same care as source code
2. **Test before deploying** - Always test configuration changes locally first
3. **Document changes** - Keep this guide updated when you modify configurations
4. **Secure sensitive data** - Use environment variables for secrets, not config files
