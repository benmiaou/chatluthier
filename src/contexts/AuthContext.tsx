import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import React from 'react';

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
  requestPasswordReset: (
    pseudo: string,
    secretAnswer: string,
    newPassword: string
  ) => Promise<{ success: boolean }>;
  getSecretQuestion: (pseudo: string) => Promise<{ secretQuestion: string }>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }): React.ReactElement {
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
      } catch (_err: unknown) {
        // Ignore session check errors
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
    if (!auth.isSignedIn) {
      return;
    }

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
        } catch (_err: unknown) {
          signOut();
        }
      },
      55 * 60 * 1000
    ); // 55 minutes

    return () => {
      clearInterval(refreshInterval);
    };
  }, [auth.isSignedIn, signOut]);

  const renderButton = useCallback((_container: HTMLElement): void => {
    // No longer used - Google authentication has been removed
    // Keep empty function for backward compatibility
  }, []);

  const loginWithPseudo = useCallback(async (pseudo: string, _password: string) => {
    const res = await fetch('/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pseudo, password: _password }),
      credentials: 'include',
    });

    const responseText = await res.text();

    if (!res.ok) {
      // Simple error handling - just throw with response text or default message
      const errorMessage =
        responseText && responseText !== 'Login failed' ? responseText : 'Login failed';
      throw new Error(errorMessage);
    }

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
  }, []);

  const registerWithPseudo = useCallback(
    async (pseudo: string, password: string, secretQuestion: string, secretAnswer: string) => {
      const res = await fetch('/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pseudo, password, secretQuestion, secretAnswer }),
        credentials: 'include',
      });

      const responseText = await res.text();

      if (!res.ok) {
        // Registration failed
        try {
          const errorData = JSON.parse(responseText);
          const errorMessage = errorData.error || 'Registration failed';
          const errorToThrow = new Error(errorMessage);
          throw errorToThrow;
        } catch (_parseError) {
          // JSON parse error
          // Try to extract error message from JSON string if parsing failed
          try {
            const jsonMatch = responseText.match(/"error":"([^"]+)"/);
            const errorMessage = jsonMatch ? jsonMatch[1] : responseText || 'Registration failed';
            const errorToThrow = new Error(errorMessage);
            throw errorToThrow;
          } catch (_e) {
            const errorToThrow = new Error(responseText || 'Registration failed');
            throw errorToThrow;
          }
        }
      }

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
    },
    []
  );

  const requestPasswordReset = useCallback(
    async (pseudo: string, secretAnswer: string, newPassword: string) => {
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
    },
    []
  );

  const getSecretQuestion = useCallback(async (pseudo: string) => {
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
  }, []);

  const contextValue = useMemo(
    () => ({
      ...auth,
      signOut,
      renderButton,
      loginWithPseudo,
      registerWithPseudo,
      requestPasswordReset,
      getSecretQuestion,
    }),
    [
      auth,
      signOut,
      renderButton,
      loginWithPseudo,
      registerWithPseudo,
      requestPasswordReset,
      getSecretQuestion,
    ]
  );

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuthContext must be used within AuthProvider');
  }
  return ctx;
}
