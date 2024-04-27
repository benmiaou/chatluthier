const GoogleLogin = {
    CLIENT_ID: '793652859374-lvh19kj1d49a33cola5ui3tsj1hsg2li.apps.googleusercontent.com',
    isSignedIn: false,
    Token: "",

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
        GoogleLogin.updateLoginButton();
    },

    handleLogin() 
    {
        google.accounts.id.prompt();  // Trigger the Google Sign-In prompt
    },

    handleLogout() 
    {
        GoogleLogin.isSignedIn = false;
        GoogleLogin.updateLoginButton();
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

