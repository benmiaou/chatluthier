import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

interface AuthState {
  isSignedIn: boolean;
  userId: string | null;
  userName: string | null;
  isAdmin: boolean;
  token: string | null;
}

interface AuthContextValue extends AuthState {
  signOut: () => void;
  renderButton: (container: HTMLElement) => void;
  loginWithPseudo: (pseudo: string, password: string) => Promise<void>;
  registerWithPseudo: (
    pseudo: string,
    password: string,
    secretQuestion: string,
    secretAnswer: string
  ) => Promise<void>;
  requestPasswordReset: (pseudo: string, secretAnswer: string, newPassword: string) => Promise<any>;
  getSecretQuestion: (pseudo: string) => Promise<{ secretQuestion: string }>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<AuthState>({
    isSignedIn: false,
    userId: null,
    userName: null,
    isAdmin: false,
    token: null,
  });

  const signOut = useCallback(() => {
    // Clear pseudo from localStorage
    localStorage.removeItem('userPseudo');
    setAuth({ isSignedIn: false, userId: null, userName: null, isAdmin: false, token: null });
  }, []);

  // Check for existing session on initial load
  useEffect(() => {
    const checkSession = async () => {
      try {
        const res = await fetch('/check-session', {
          method: 'GET',
          credentials: 'include',
        });

        if (res.ok) {
          const data = await res.json();
          if (data.isSignedIn) {
            setAuth({
              isSignedIn: true,
              userId: data.userId,
              userName: data.email || data.pseudo || null,
              isAdmin: data.isAdmin || false,
              token: null,
            });
          }
        }
      } catch (err) {
        console.error('Session check failed:', err);
      }
    };

    // Add a small delay to ensure page is fully loaded before checking session
    const sessionTimeout = setTimeout(() => {
      checkSession();
    }, 1000); // 500ms delay

    return () => {
      clearTimeout(sessionTimeout);
    };
  }, []);

  // Set up token refresh mechanism
  useEffect(() => {
    if (!auth.isSignedIn) return;

    // Refresh token every 55 minutes to maintain session (before 1-hour access token expires)
    const refreshInterval = setInterval(
      async () => {
        try {
          const res = await fetch('/refresh-token', {
            method: 'POST',
            credentials: 'include',
          });

          if (!res.ok) {
            // If refresh fails, sign out the user
            signOut();
          }
        } catch (err) {
          console.error('Token refresh failed:', err);
          signOut();
        }
      },
      55 * 60 * 1000
    ); // 55 minutes

    return () => clearInterval(refreshInterval);
  }, [auth.isSignedIn, signOut]);

  const renderButton = useCallback((container: HTMLElement) => {
    // No longer used - Google authentication has been removed
    // Keep empty function for backward compatibility
  }, []);

  const loginWithPseudo = useCallback(async (pseudo: string, password: string) => {
    try {
      const res = await fetch('/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pseudo, password }),
        credentials: 'include',
      });

      const responseText = await res.text();

      if (!res.ok) {
        try {
          const errorData = JSON.parse(responseText);
          throw new Error(errorData.error || 'Login failed');
        } catch (e) {
          throw new Error(responseText || 'Login failed');
        }
      }

      try {
        const data = JSON.parse(responseText);
        // Store pseudo in localStorage for WebSocket session tracking
        localStorage.setItem('userPseudo', data.pseudo);

        setAuth({
          isSignedIn: true,
          userId: data.userId,
          userName: data.pseudo,
          isAdmin: data.isAdmin ?? false,
          token: null,
        });
      } catch (e) {
        throw new Error('Invalid response format');
      }
    } catch (err) {
      console.error('Pseudo login error:', err);
      throw err;
    }
  }, []);

  const registerWithPseudo = useCallback(
    async (pseudo: string, password: string, secretQuestion: string, secretAnswer: string) => {
      try {
        const res = await fetch('/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pseudo, password, secretQuestion, secretAnswer }),
          credentials: 'include',
        });

        const responseText = await res.text();

        if (!res.ok) {
          console.log('Registration failed with status:', res.status);
          console.log('Response text:', responseText);
          try {
            const errorData = JSON.parse(responseText);
            const errorMessage = errorData.error || 'Registration failed';
            console.log('Parsed backend error:', errorMessage);
            const errorToThrow = new Error(errorMessage);
            console.log('Error object to throw:', errorToThrow);
            throw errorToThrow;
          } catch (parseError) {
            console.log('JSON parse error:', parseError.message);
            console.log('Raw response text:', responseText);
            // Try to extract error message from JSON string if parsing failed
            try {
              const jsonMatch = responseText.match(/"error":"([^"]+)"/);
              const errorMessage = jsonMatch ? jsonMatch[1] : responseText || 'Registration failed';
              const errorToThrow = new Error(errorMessage);
              console.log('Fallback error to throw:', errorToThrow);
              throw errorToThrow;
            } catch (e) {
              const errorToThrow = new Error(responseText || 'Registration failed');
              console.log('Final fallback error to throw:', errorToThrow);
              throw errorToThrow;
            }
          }
        }

        try {
          const data = JSON.parse(responseText);
          // Store pseudo in localStorage for WebSocket session tracking
          localStorage.setItem('userPseudo', data.pseudo);

          setAuth({
            isSignedIn: true,
            userId: data.userId,
            userName: data.pseudo,
            isAdmin: false, // New users are not admins
            token: null,
          });
        } catch (e) {
          throw new Error('Invalid response format');
        }
      } catch (err) {
        console.error('Pseudo registration error:', err);
        throw err;
      }
    },
    []
  );

  const requestPasswordReset = useCallback(
    async (pseudo: string, secretAnswer: string, newPassword: string) => {
      try {
        const res = await fetch('/request-password-reset', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pseudo, secretAnswer, newPassword }),
          credentials: 'include',
        });

        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || 'Password reset failed');
        }

        return await res.json();
      } catch (err) {
        console.error('Password reset error:', err);
        throw err;
      }
    },
    []
  );

  const getSecretQuestion = useCallback(async (pseudo: string) => {
    try {
      const res = await fetch('/get-secret-question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pseudo }),
        credentials: 'include',
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to retrieve secret question');
      }

      return await res.json();
    } catch (err) {
      console.error('Get secret question error:', err);
      throw err;
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        ...auth,
        signOut,
        renderButton,
        loginWithPseudo,
        registerWithPseudo,
        requestPasswordReset,
        getSecretQuestion,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuthContext must be used within AuthProvider');
  return ctx;
}
