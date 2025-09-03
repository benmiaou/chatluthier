# Spotify Integration Setup Guide

This guide will help you set up Spotify integration for background music in Chat Luthier.

## 🚨 Quick Fix for "400 Bad Request" Error

If you're seeing this error, you need to replace the placeholder Client ID:

1. **Open** `src/js/spotifyConfig.js`
2. **Replace** `'YOUR_SPOTIFY_CLIENT_ID'` with your actual Spotify Client ID
3. **Save** the file and restart your app

**Get your Client ID from**: https://developer.spotify.com/dashboard

## Prerequisites

1. A Spotify Premium account (required for Web Playback SDK)
2. A Spotify Developer account
3. Node.js and npm installed

## Step 1: Create a Spotify App

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Log in with your Spotify account
3. Click "Create App"
4. Fill in the app details:
   - **App name**: Chat Luthier
   - **App description**: Background music for role-playing games
   - **Website**: Your domain (e.g., `http://localhost:3000` for development)
   - **Redirect URI**: Your domain (e.g., `http://localhost:3000`)
   - **API/SDKs**: Web API
5. Click "Save"

## Step 2: Get Your Credentials

1. In your app dashboard, note down:
   - **Client ID**: This is your app's identifier
   - **Client Secret**: Keep this secure (not needed for client-side auth)

## Step 3: Configure the App

1. Open `src/js/spotifyConfig.js`
2. Replace `YOUR_SPOTIFY_CLIENT_ID` with your actual Client ID:

```javascript
export const spotifyConfig = {
    clientId: 'your_actual_client_id_here', // Replace this
    redirectUri: window.location.origin,
    // ... rest of config
};
```

## Step 4: Update Redirect URIs

1. In your Spotify app dashboard, go to "Edit Settings"
2. Add these redirect URIs:
   - `http://localhost:3000` (for development)
   - `https://yourdomain.com` (for production)
   - `http://localhost:8080` (if using webpack dev server)

## Step 5: Test the Integration

1. Start your development server
2. Open the app in your browser
3. Click the "Toggle Spotify" button in the menu
4. Click "Connect Spotify"
5. Authorize the app with your Spotify account
6. Test the mood-based music playback

## Features

### Mood-Based Music
- **Calm**: Acoustic, instrumental, ambient music
- **Dynamic**: Upbeat, energetic, dance music
- **Intense**: Epic, orchestral, dramatic music
- **All**: Popular trending hits

### Playback Controls
- Play/Pause
- Next/Previous track
- Volume control
- Playlist selection

### Integration
- Seamlessly works with existing background music system
- Falls back to local audio files when Spotify is not connected
- Maintains session state across page reloads

## Troubleshooting

### Common Issues

1. **"400 Bad Request" or "Invalid redirect URI" error**
   - **Most Common Cause**: You're still using the placeholder `YOUR_SPOTIFY_CLIENT_ID`
   - **Solution**: Replace `YOUR_SPOTIFY_CLIENT_ID` in `src/js/spotifyConfig.js` with your actual Client ID
   - **Check**: Open browser console - you should see a detailed setup guide if this is the issue

2. **"Invalid redirect URI" error**
   - Make sure your redirect URI exactly matches what's in the Spotify dashboard
   - Check for trailing slashes or protocol mismatches
   - For development: use `http://localhost:3000` (exact match)

3. **"Premium account required" error**
   - Spotify Web Playback SDK requires a Premium account
   - Free accounts can still use search and playlist features

4. **Authentication fails**
   - Clear browser cache and cookies
   - Check if your Spotify app is properly configured
   - Verify your Client ID is correct

5. **Music doesn't play**
   - Ensure you have an active Spotify session
   - Check if another device is actively playing
   - Verify your device is available for playback

### Debug Mode

Enable debug logging by opening the browser console and looking for:
- Spotify authentication messages
- Player initialization logs
- API request/response logs

## Security Notes

- Never expose your Client Secret in client-side code
- The access token is stored in localStorage (consider using more secure storage for production)
- Tokens expire after 1 hour and need to be refreshed

## Production Deployment

1. Update redirect URIs in Spotify dashboard to your production domain
2. Ensure HTTPS is enabled (required for production)
3. Test authentication flow in production environment
4. Monitor API usage and rate limits

## API Limits

- Spotify Web API has rate limits (100 requests per second)
- Web Playback SDK has device limits
- Consider implementing request caching for better performance

## Support

If you encounter issues:
1. Check the browser console for error messages
2. Verify your Spotify app configuration
3. Test with a different Spotify account
4. Check Spotify's status page for service issues

## License

This integration uses Spotify's Web API and Web Playback SDK, which are subject to Spotify's terms of service.
