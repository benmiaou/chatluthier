// src/js/spotifyAuthManager.js

class SpotifyAuthManager {
    constructor() {
        this.isAuthenticated = false;
        this.isInitialized = false;
        this.authState = 'disconnected'; // 'disconnected', 'connecting', 'connected', 'error'
        this.listeners = new Set();
        this.callbackProcessed = false; // Flag to prevent multiple callback processing
    }

    // Initialize the auth manager
    async init() {
        if (this.isInitialized) return;
        
        // Check for existing token
        const token = localStorage.getItem('spotify_access_token');
        if (token) {
            this.authState = 'connected';
            this.isAuthenticated = true;
            console.log('AuthManager: Found existing token');
        } else {
            this.authState = 'disconnected';
            this.isAuthenticated = false;
            console.log('AuthManager: No existing token found');
        }
        
        this.isInitialized = true;
        this.notifyListeners();
    }

    // Set authentication state
    setAuthState(state, token = null) {
        const previousState = this.authState;
        this.authState = state;
        
        switch (state) {
            case 'connected':
                this.isAuthenticated = true;
                if (token) {
                    localStorage.setItem('spotify_access_token', token);
                }
                break;
            case 'disconnected':
                this.isAuthenticated = false;
                localStorage.removeItem('spotify_access_token');
                break;
            case 'error':
                this.isAuthenticated = false;
                break;
        }
        
        console.log(`AuthManager: State changed from ${previousState} to ${state}`);
        this.notifyListeners();
    }

    // Get current auth state
    getAuthState() {
        return {
            state: this.authState,
            isAuthenticated: this.isAuthenticated
        };
    }

    // Add state change listener
    addListener(callback) {
        this.listeners.add(callback);
        // Call immediately with current state
        callback(this.getAuthState());
    }

    // Remove state change listener
    removeListener(callback) {
        this.listeners.delete(callback);
    }

    // Notify all listeners of state change
    notifyListeners() {
        const currentState = this.getAuthState();
        this.listeners.forEach(callback => {
            try {
                callback(currentState);
            } catch (error) {
                console.error('Error in auth state listener:', error);
            }
        });
    }

    // Handle authentication callback (PKCE flow)
    async handleCallback() {
        console.log('AuthManager: handleCallback called');
        console.log('AuthManager: Current URL:', window.location.href);
        console.log('AuthManager: Current search params:', window.location.search);
        
        // If we're already connected, don't process callback again
        if (this.authState === 'connected') {
            console.log('AuthManager: Already connected, skipping callback');
            return true;
        }
        
        // If we've already processed a callback, don't process again
        if (this.callbackProcessed) {
            console.log('AuthManager: Callback already processed, skipping');
            return this.authState === 'connected';
        }
        
        this.setAuthState('connecting');
        
        try {
            // PKCE flow uses search params, not hash
            const searchParams = new URLSearchParams(window.location.search);
            console.log('AuthManager: Search params:', Object.fromEntries(searchParams));
            
            if (!searchParams.has('code')) {
                console.log('AuthManager: No authorization code found, staying disconnected');
                this.setAuthState('disconnected');
                return false;
            }
            
            // Verify state parameter for CSRF protection
            const returnedState = searchParams.get('state');
            const storedState = localStorage.getItem('spotify_auth_state');
            
            console.log('AuthManager: State verification - returned:', returnedState, 'stored:', storedState);
            
            if (returnedState !== storedState) {
                console.error('AuthManager: State mismatch - possible CSRF attack');
                console.error('AuthManager: Returned state:', returnedState);
                console.error('AuthManager: Stored state:', storedState);
                this.setAuthState('error');
                return false;
            }
            
            // Get the authorization code
            const authCode = searchParams.get('code');
            console.log('AuthManager: Processing authorization code, length:', authCode ? authCode.length : 0);
            
            // Exchange code for token
            const tokenResult = await this.exchangeCodeForToken(authCode);
            
            if (tokenResult.success) {
                // Remove search params from URL
                window.history.replaceState({}, document.title, window.location.pathname);
                console.log('AuthManager: Search params removed from URL');
                
                this.callbackProcessed = true; // Mark callback as processed
                this.setAuthState('connected', tokenResult.accessToken);
                return true;
            } else {
                console.error('AuthManager: Token exchange failed:', tokenResult.error);
                
                // Dispatch error event
                window.dispatchEvent(new CustomEvent('spotifyAuthError', {
                    detail: { error: tokenResult.error }
                }));
                
                this.setAuthState('error');
                return false;
            }
            
        } catch (error) {
            console.error('AuthManager: Error handling callback:', error);
            this.setAuthState('error');
            return false;
        }
    }

    // Exchange authorization code for access token
    async exchangeCodeForToken(authCode) {
        try {
            const codeVerifier = localStorage.getItem('spotify_code_verifier');
            if (!codeVerifier) {
                throw new Error('No code verifier found');
            }
            
            console.log('AuthManager: Exchanging code for token...');
            console.log('AuthManager: Auth code:', authCode);
            console.log('AuthManager: Code verifier:', codeVerifier);
            
            // Call our backend endpoint to exchange the code for a token
            const response = await fetch('/api/spotify/token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    code: authCode,
                    code_verifier: codeVerifier,
                    redirect_uri: window.location.origin
                })
            });
            
            const result = await response.json();
            
            if (response.ok) {
                console.log('AuthManager: Token exchange successful');
                return {
                    success: true,
                    accessToken: result.access_token
                };
            } else {
                console.error('AuthManager: Token exchange failed:', result.error);
                return {
                    success: false,
                    error: result.error
                };
            }
            
        } catch (error) {
            console.error('AuthManager: Error exchanging code for token:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Clear authentication
    clearAuth() {
        this.setAuthState('disconnected');
        this.callbackProcessed = false; // Reset callback processed flag
        
        // Clean up PKCE-related data
        localStorage.removeItem('spotify_code_verifier');
        localStorage.removeItem('spotify_auth_state');
    }
    
    // Reset callback processed flag (useful for testing or re-authentication)
    resetCallbackFlag() {
        this.callbackProcessed = false;
        console.log('AuthManager: Callback processed flag reset');
    }
    
    // Clear error state and reset for retry
    clearErrorState() {
        if (this.authState === 'error') {
            this.authState = 'disconnected';
            this.isAuthenticated = false;
            this.callbackProcessed = false;
            
            // Clean up PKCE-related data for fresh start
            localStorage.removeItem('spotify_code_verifier');
            localStorage.removeItem('spotify_auth_state');
            
            console.log('AuthManager: Error state cleared, ready for retry');
            this.notifyListeners();
        }
    }
}

// Export singleton instance
export const spotifyAuthManager = new SpotifyAuthManager();

// Make it globally accessible for debugging and retry functionality
window.spotifyAuthManager = spotifyAuthManager;
