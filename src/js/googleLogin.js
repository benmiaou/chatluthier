// src/js/googleLogin.js

import { BackgroundMusic } from './backgroundMusic.js';
import { SoundBoard } from './soundboard.js';
import { AmbianceSounds } from './ambianceSounds.js';

export const GoogleLogin = {
    CLIENT_ID: '793652859374-lvh19kj1d49a33cola5ui3tsj1hsg2li.apps.googleusercontent.com',
    isSignedIn: false,
    userId: null,
    userMail: "",

    initGoogleIdentityServices() {
        if (typeof google === 'undefined') {
            console.error('Google Identity Services script not loaded.');
            return;
        }

        // Check if there's a saved session
        this.restoreSession();

        google.accounts.id.initialize({
            client_id: this.CLIENT_ID,
            callback: this.handleCredentialResponse.bind(this),
        });
        google.accounts.id.renderButton(
            document.getElementById('google-login-button'),
            { theme: 'outline', size: 'medium' }
        );

        setInterval(() => {
            if (this.isSignedIn) {
                this.refreshAccessToken();
            }
        }, 50 * 60 * 1000); // Refresh every 50 minutes
    },

    displayAdminFunctions() {
        const buttons = ['openEditSoundAdminModal', 'openAddSoundModalAdminButton', 'openRequestSoundModalAdminButton'];
        buttons.forEach(id => {
            const button = document.getElementById(id);
            if (button) {
                button.style.display = 'inline-block';
            }
        });
    },

    sendTokenToServer: async function(idToken) {
        try {
            const response = await fetch('/verify-login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ idToken }),
                credentials: 'include', // Include cookies in the request
            });
            if (!response.ok) {
                throw new Error('Server verification failed.');
            }
            return await response.json();
        } catch (error) {
            console.error('Error sending token to server:', error);
            return null;
        }
    },
    
    loginInitUI()
    {
        console.log("loginInitUI")
         // Update UI (buttons, sounds, etc.)
         this.updateLoginButton();
         BackgroundMusic.preloadBackgroundSounds();
         SoundBoard.loadSoundboardButtons();
         AmbianceSounds.loadAmbianceButtons();
 
         // Make the "Edit Music" button visible
         const editMusicButton = document.getElementById('openEditSoundUserModal');
         if (editMusicButton) {
             editMusicButton.style.display = 'inline-block';
         }
    },

    handleCredentialResponse(response) {
        this.isSignedIn = true;

        // Extract the payload from the token (for local use, e.g., to update UI)
        const payload = JSON.parse(atob(response.credential.split('.')[1]));
        this.userId = payload.sub;
        this.userMail = payload.email;

        this.loginInitUI();

        // Send token to server for verification
        this.sendTokenToServer(response.credential)
            .then(serverData => {
                if (serverData) {
                    console.log("Server verified data:", serverData);
                    if (serverData.isAdmin) {
                        this.displayAdminFunctions();
                    }
                }
            })
            .catch(error => {
                console.error("Failed to verify token on server:", error);
            });
    },

    handleLogout() {
        console.log('Clearing out session');

        this.isSignedIn = false;
        this.userId = null;
        this.userMail = "";

        fetch('/logout', {
            method: 'POST',
            credentials: 'include',
        }).then(() => {
            console.log('Session cleared out, reloading');
            window.location.reload();
        });
    },

    updateLoginButton() {
        const loginButton = document.getElementById('google-login-button');
        if (!loginButton) {
            console.error("Login button with ID 'google-login-button' not found.");
            return;
        }
        if (this.isSignedIn) {
            loginButton.textContent = 'Logout';
            loginButton.onclick = this.handleLogout.bind(this);
        }
    },

    async refreshAccessToken() {
        try {
            const response = await fetch('/refresh-token', {
                method: 'POST',
                credentials: 'include', // Include cookies in the request
            });
            if (!response.ok) {
                throw new Error('Failed to refresh access token.');
            }
            const data = await response.json();
            this.isSignedIn = true;
            this.updateLoginButton();
            console.log("Token refreshed successfully.");
        } catch (error) {
            console.error('Error refreshing access token:', error);
            this.handleLogout(); // Logout if token refresh fails
        }
    },

    restoreSession() {
        // Check if the user is signed in by sending a request to the server
        fetch('/check-session', {
            method: 'GET',
            credentials: 'include',
        }).then(response => {
            if (response.ok) {
                return response.json();
            }
            throw new Error('Session not active.');
        }).then(data => {
            if (data.isSignedIn) {
                this.isSignedIn = true;
                this.userId = data.userId;
                this.userMail = data.userMail;
                this.loginInitUI();
                this.updateLoginButton();
                if (data.isAdmin) {
                    this.displayAdminFunctions();
                }
            }
        }).catch(error => {
            console.error('Error restoring session:', error);
        });
    },
};
