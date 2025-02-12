// src/js/googleLogin.js

import { BackgroundMusic } from './backgroundMusic.js';
import { SoundBoard } from './soundboard.js';
import { AmbianceSounds } from './ambianceSounds.js';

export const GoogleLogin = {
    CLIENT_ID: '793652859374-lvh19kj1d49a33cola5ui3tsj1hsg2li.apps.googleusercontent.com',
    isSignedIn: false,
    Token: "",
    userId: null, // To store the unique user ID

    initGoogleIdentityServices() {
        if (typeof google === 'undefined') {
            console.error('Google Identity Services script not loaded.');
            return;
        }

        // Check if there's a saved session
        this.restoreSession();

        if (this.isSignedIn) {
            this.updateLoginButton();
            BackgroundMusic.preloadBackgroundSounds();
            SoundBoard.loadSoundboardButtons();
            AmbianceSounds.loadAmbianceButtons();

            // Make the "Edit Music" button visible
            const editMusicButton = document.getElementById('openEditSoundUserModal');
            if (editMusicButton) {
                editMusicButton.style.display = 'inline-block';
            }
        }

        google.accounts.id.initialize({
            client_id: this.CLIENT_ID,
            callback: this.handleCredentialResponse.bind(this), // Bind the context here
        });
        google.accounts.id.renderButton(
            document.getElementById('google-login-button'),
            { theme: 'outline', size: 'medium' } // customization attributes
        );
    },

    displayAdminFunctions()
    {
        // Make the "Edit Music" button visible
        let button = document.getElementById('openEditSoundAdminModal');
        if (button) {
            button.style.display = 'inline-block';
        }
        button = document.getElementById('openAddsoundModalAdminButton');
        if (button) {
            button.style.display = 'inline-block';
        }
    },


    // Define the helper method as a property of the object
    sendTokenToServer: async function(idToken) {
        try {
            const response = await fetch('/verify-login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ idToken })
            });
            if (!response.ok) {
                throw new Error('Server verification failed.');
            }
            const data = await response.json();
            return data; // This should contain fields like userId, email, isAdmin, etc.
        } catch (error) {
            console.error('Error sending token to server:', error);
            return null;
        }
    },
      

    handleCredentialResponse(response) {
        console.log("Google Sign-In response:", response);
        this.idToken = response.credential;
        this.isSignedIn = true;
    
        // Extract the payload from the token (for local use, e.g. to update UI)
        const payload = JSON.parse(atob(response.credential.split('.')[1]));
        this.userId = payload.sub;
        console.log("Local user ID:", this.userId);
    
        // Save session details in localStorage
        this.saveSession();
    
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
    
        // *** NEW: Send token to server for verification ***
        this.sendTokenToServer(this.idToken)
          .then(serverData => {
              if (serverData) {
                  console.log("Server verified data:", serverData);
                  // For example, if your server returns isAdmin flag:
                  if (serverData.isAdmin) {
                    this.displayAdminFunctions()
                    console.log("User is an admin.");
                  } else {
                      console.log("User is not an admin.");
                  }
              }
          })
          .catch(error => {
              console.error("Failed to verify token on server:", error);
          });
    },
    

    // TODO Remove, this is for me deprecated - Guillaume 19/11/2024
    handleLogin() {
        if (typeof google !== 'undefined' && google.accounts && google.accounts.id) {
            google.accounts.id.prompt();  // Trigger the Google Sign-In prompt
        } else {
            console.error('Google Identity Services script not loaded.');
        }
    },

    handleLogout() {
        console.log('Clearing out session');

        this.isSignedIn = false;
        this.idToken = "";
        this.userId = null;

        // Clear session details from localStorage
        localStorage.removeItem('googleLoginState');

        // Optionally, revoke token
        if (this.idToken) {
            fetch(`https://oauth2.googleapis.com/revoke?token=${this.idToken}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
            })
            .then((response) => {
                if (response.ok) {
                    console.log('Token successfully revoked.');
                } else {
                    console.error('Failed to revoke token.');
                }
            })
            .catch((error) => {
                console.error('Error revoking token:', error);
            });
        }

        // Reload the page or update UI
        console.log('Session cleared out, reloading')
        window.location.reload();
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
        } else {
            // The button is rendered in initGoogleIdentityServices
            // No action needed here
        }
    },

    saveSession() {
        const sessionData = {
            isSignedIn: this.isSignedIn,
            idToken: this.idToken,
            userId: this.userId,
        };
        console.log('Saving session');
        localStorage.setItem('googleLoginState', JSON.stringify(sessionData));
    },

    restoreSession() {
        const sessionData = localStorage.getItem('googleLoginState');
        if (!sessionData) {
            console.log("No session found");
            return; // Exit early if sessionData is null or undefined
        }
        console.log('Restoring session');
        const { isSignedIn, idToken, userId } = JSON.parse(sessionData);
        if (isSignedIn && idToken && userId) {
            this.isSignedIn = isSignedIn;
            this.idToken = idToken;
            this.userId = userId;
            this.updateLoginButton();
    
            // Verify the saved token with the server to ensure it's still valid
            this.sendTokenToServer(this.idToken)
                .then(serverData => {
                    if (serverData) {
                        console.log("Server verified session data:", serverData);
                        if (serverData.isAdmin) {
                            console.log("User is an admin.");
                            this.displayAdminFunctions();
                        } else {
                            console.log("User is not an admin.");
                        }
                    } else {
                        console.warn("Server verification did not return data.");
                    }
                })
                .catch(error => {
                    console.error("Error verifying session token on server:", error);
                });
        }
        console.log('Session successfully restored');
    },
};
