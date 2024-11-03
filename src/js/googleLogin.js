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
        google.accounts.id.initialize({
            client_id: this.CLIENT_ID,
            callback: this.handleCredentialResponse.bind(this), // Bind the context here
        });
        google.accounts.id.renderButton(
            document.getElementById('google-login-button'),
            { theme: 'outline', size: 'medium' } // customization attributes
        );
    },

    handleCredentialResponse(response) {
        console.log("Google Sign-In response:", response);
        this.idToken = response.credential;
        this.isSignedIn = true;

        // Extract the user ID
        const payload = JSON.parse(atob(response.credential.split('.')[1]));
        this.userId = payload.sub;
        console.log(this.userId);

        this.updateLoginButton();
        BackgroundMusic.preloadBackgroundSounds();
        SoundBoard.loadSoundboardButtons();
        AmbianceSounds.loadAmbianceButtons();

        // Make the "Edit Music" button visible
        const editMusicButton = document.getElementById('openEditSoundModal');
        if (editMusicButton) {
            editMusicButton.style.display = 'inline-block'; // Make the button visible
        }
    },

    handleLogin() {
        if (typeof google !== 'undefined' && google.accounts && google.accounts.id) {
            google.accounts.id.prompt();  // Trigger the Google Sign-In prompt
        } else {
            console.error('Google Identity Services script not loaded.');
        }
    },

    handleLogout() {
        this.isSignedIn = false;
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
};
