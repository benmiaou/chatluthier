import { initializeApp } from "https://www.gstatic.com/firebasejs/9.19.0/firebase-app.js";
import { GoogleAuthProvider, getAuth, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.19.0/firebase-auth.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/9.19.0/firebase-analytics.js";

const firebaseConfig = {
  apiKey: "AIzaSyCGt7Hgg4rZiTJHB-6z8MiRpP8SXioxnJA",
  authDomain: "chatluthier.firebaseapp.com",
  projectId: "chatluthier",
  storageBucket: "chatluthier.appspot.com",
  messagingSenderId: "793652859374",
  appId: "1:793652859374:web:c0eebc5e8511fced13feff",
  measurementId: "G-JMVQCVQK9K",
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app); // Firebase Auth instance

const googleAuthProvider = new GoogleAuthProvider();
const googleLoginButton = document.getElementById("google-login-button");

// Function to sign in
const signIn = async () => {
  try {
    const result = await signInWithPopup(auth, googleAuthProvider); // Sign in with Google
    console.log("Google login successful:", result);

    const idToken = await result.user.getIdToken(); // Obtain the ID token
    
    // Send the ID token to the server
    const response = await fetch("http://localhost:3000/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ idToken }), // Send the ID token
    });

    const data = await response.json(); // Handle server response
    console.log("Server response:", data);

    // Change the button text to "Logout" and update the event listener to sign out
    googleLoginButton.textContent = "Logout";
    googleLoginButton.removeEventListener("click", signIn);
    googleLoginButton.addEventListener("click", signOutUser);
  } catch (error) {
    console.error("Google login error:", error);
  }
};

// Function to sign out
const signOutUser = async () => {
  try {
    await signOut(auth); // Sign out the user
    console.log("User signed out successfully");

    // Change the button text to "Login with Google" and update the event listener to sign in
    googleLoginButton.textContent = "Login with Google";
    googleLoginButton.removeEventListener("click", signOutUser);
    googleLoginButton.addEventListener("click", signIn);
  } catch (error) {
    console.error("Error signing out:", error);
  }
};

// Listen for authentication state changes
onAuthStateChanged(auth, (user) => {
  if (user) {
    // User is signed in, set button to "Logout"
    googleLoginButton.textContent = "Logout";
    googleLoginButton.removeEventListener("click", signIn);
    googleLoginButton.addEventListener("click", signOutUser);
  } else {
    // User is signed out, set button to "Login with Google"
    googleLoginButton.textContent = "Login with Google";
    googleLoginButton.removeEventListener("click", signOutUser);
    googleLoginButton.addEventListener("click", signIn);
  }
});
