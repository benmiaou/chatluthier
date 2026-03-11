import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import React from 'react';
import { handleError } from '../utils/logger';
import { apiFetch } from '../services/api';

interface AuthState {
  isSignedIn: boolean;
  userId: string | null;
  userName: string | null;
  userPicture: string | null;
  isAdmin: boolean;
  token: string | null;
}

interface AuthContextValue extends AuthState {
  isSignedIn: boolean;
  userName: string | null;
  userPicture: string | null; // Add this line
  signOut: () => Promise<void>;
  loginWithPseudo: (pseudo: string, password: string, rememberMe?: boolean) => Promise<void>;
  registerWithPseudo: (
    pseudo: string,
    password: string,
    secretQuestion: string,
    secretAnswer: string
  ) => Promise<void>;
  getSecretQuestion: (pseudo: string) => Promise<{ secretQuestion: string }>;
  requestPasswordReset: (
    pseudo: string,
    secretAnswer: string,
    newPassword: string
  ) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: Readonly<{ children: ReactNode }>): React.ReactElement {
  const [auth, setAuth] = useState<AuthState>({
    isSignedIn: false,
    userId: null,
    userName: null,
    userPicture: null,
    isAdmin: false,
    token: null,
  });

  const signOut = useCallback(async () => {
    // Clear pseudo from localStorage
    localStorage.removeItem('userPseudo');
    setAuth({
      isSignedIn: false,
      userId: null,
      userName: null,
      userPicture: null,
      isAdmin: false,
      token: null,
    });
  }, []);

  // Check for existing session on initial load
  useEffect(() => {
    const checkSession = async () => {
      try {
        // First, try to check the session with the current access token
        try {
          const data = await apiFetch<{
            isSignedIn: boolean;
            userId?: string;
            email?: string;
            pseudo?: string;
            userPicture?: string;
            isAdmin?: boolean;
            error?: string;
          }>('/check-session');

          if (data.isSignedIn) {
            setAuth({
              isSignedIn: true,
              userId: data.userId ?? null,
              userName: data.email || data.pseudo || null,
              userPicture: data.userPicture || null,
              isAdmin: data.isAdmin || false,
              token: null,
            });
          }
        } catch (_sessionErr) {
          // If session check fails, try to refresh the token
          try {
            await apiFetch('/refresh-token', { method: 'POST' });

            // After successful refresh, try session check again
            const retryData = await apiFetch<{
              isSignedIn: boolean;
              userId?: string;
              email?: string;
              pseudo?: string;
              userPicture?: string;
              isAdmin?: boolean;
            }>('/check-session');

            if (retryData.isSignedIn) {
              setAuth({
                isSignedIn: true,
                userId: retryData.userId ?? null,
                userName: retryData.email || retryData.pseudo || null,
                userPicture: retryData.userPicture || null,
                isAdmin: retryData.isAdmin || false,
                token: null,
              });
            }
          } catch (_refreshErr) {
            // FALLBACK: Check localStorage for tokens (development workaround)
            const storedUser = localStorage.getItem('persistentUser');
            if (storedUser) {
              try {
                const userData = JSON.parse(storedUser);
                setAuth({
                  isSignedIn: true,
                  userId: userData.userId ?? null,
                  userName: userData.userName,
                  userPicture: userData.userPicture || null,
                  isAdmin: userData.isAdmin || false,
                  token: null,
                });
              } catch (_localStorageErr) {
                // Silent error handling for localStorage parsing
              }
            }
          }
        }
      } catch (err: unknown) {
        handleError(err, 'AuthContext.checkSession');
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
        } catch (err: unknown) {
          handleError(err, 'AuthContext.tokenRefresh');
          signOut();
        }
      },
      55 * 60 * 1000
    ); // 55 minutes

    return () => {
      clearInterval(refreshInterval);
    };
  }, [auth.isSignedIn, signOut]);

  const loginWithPseudo = useCallback(
    async (pseudo: string, _password: string, rememberMe = false) => {
      const data = await apiFetch<{
        userId: string;
        pseudo: string;
        isAdmin: boolean;
        userPicture?: string;
      }>('/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pseudo, password: _password, rememberMe }),
      });

      // Store pseudo in localStorage for WebSocket session tracking
      localStorage.setItem('userPseudo', data.pseudo);

      // Also store user data in localStorage as fallback for cookie issues
      if (rememberMe) {
        // Store complete user data for session persistence fallback
        const persistentUser = {
          userId: data.userId,
          userName: data.pseudo,
          userPicture: data.userPicture,
          isAdmin: data.isAdmin ?? false,
          timestamp: new Date().toISOString(),
        };
        localStorage.setItem('persistentUser', JSON.stringify(persistentUser));
      } else {
        // Clear fallback data if not using remember me
        localStorage.removeItem('persistentUser');
      }

      setAuth({
        isSignedIn: true,
        userId: data.userId,
        userName: data.pseudo,
        userPicture: data.userPicture || null,
        isAdmin: data.isAdmin ?? false,
        token: null,
      });
    },
    []
  );

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
          throw new Error(errorMessage);
        } catch {
          // Try to extract error message from JSON string if parsing failed
          const errorRegex = /"error":"([^"]+)"/g;
          const jsonMatch = errorRegex.exec(responseText);
          const errorMessage = jsonMatch ? jsonMatch[1] : responseText || 'Registration failed';
          throw new Error(errorMessage);
        }
      }

      const data = JSON.parse(responseText);
      // Store pseudo in localStorage for WebSocket session tracking
      localStorage.setItem('userPseudo', data.pseudo);

      setAuth({
        isSignedIn: true,
        userId: data.userId,
        userName: data.pseudo,
        userPicture: data.userPicture || null,
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
      loginWithPseudo,
      registerWithPseudo,
      requestPasswordReset,
      getSecretQuestion,
    }),
    [auth, signOut, loginWithPseudo, registerWithPseudo, requestPasswordReset, getSecretQuestion]
  );

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
}

export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuthContext must be used within AuthProvider');
  }
  return ctx;
}
