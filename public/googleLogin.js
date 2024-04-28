const GoogleLogin = {
    CLIENT_ID: '793652859374-lvh19kj1d49a33cola5ui3tsj1hsg2li.apps.googleusercontent.com',
    isSignedIn: false,
    Token: "",
    userId: null, // To store the unique user ID


    initGoogleIdentityServices() 
    {
        google.accounts.id.initialize(
            {
            client_id: this.CLIENT_ID,
            callback: this.handleCredentialResponse,
        });
    },

    handleCredentialResponse(response) 
    {
        console.log("Google Sign-In response:", response);
        GoogleLogin.idToken = response.credential;
        GoogleLogin.isSignedIn = true;

        // Extract the user ID
        const payload = JSON.parse(atob(response.credential.split('.')[1]));
        GoogleLogin.userId = payload.sub;
        console.log(GoogleLogin.userId)

        GoogleLogin.updateLoginButton();
        BackgroundMusic.preloadBackgroundSounds();
        Soundboard.loadSoundboardButtons();
        AmbianceSounds.loadAmbianceButtons();

        // Make the "Edit Music" button visible
        const editMusicButton = document.querySelector('button[onclick="openEditSoundModal()"]');
        if (editMusicButton) {
            editMusicButton.style.display = 'inline-block'; // Make the button visible
        }
    },

    handleLogin() 
    {
        google.accounts.id.prompt();  // Trigger the Google Sign-In prompt
    },

    handleLogout() 
    {
        GoogleLogin.isSignedIn = false;
        window.location.reload();
    },

    updateLoginButton() 
    {
        const loginButton = document.getElementById('google-login-button');
        if (this.isSignedIn) {
            loginButton.textContent = 'Logout';
            loginButton.onclick = this.handleLogout;
        } else {
            google.accounts.id.renderButton(
                document.getElementById('google-login-button'),
                { theme: 'outline', size: 'medium' }
            );
        }
    },
};

