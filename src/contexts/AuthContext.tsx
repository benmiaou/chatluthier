import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

interface AuthState {
  isSignedIn: boolean;
  userId: string | null;
  userName: string | null;
  userPicture: string | null;
  isAdmin: boolean;
  token: string | null;
}

interface AuthContextValue extends AuthState {
  signOut: () => void;
  renderButton: (container: HTMLElement) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<AuthState>({
    isSignedIn: false,
    userId: null,
    userName: null,
    userPicture: null,
    isAdmin: false,
    token: null,
  });

  const handleCredentialResponse = useCallback(async (response: { credential: string }) => {
    try {
      // Decode Google JWT client-side to get name and picture
      const payload = JSON.parse(atob(response.credential.split('.')[1])) as {
        name?: string; picture?: string;
      };

      const res = await fetch('/verify-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken: response.credential }),
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Auth failed');
      const data = (await res.json()) as {
        userId: string;
        email: string;
        isAdmin: boolean;
      };
      setAuth({
        isSignedIn: true,
        userId: data.userId,
        userName: payload.name ?? data.email,
        userPicture: payload.picture ?? null,
        isAdmin: data.isAdmin ?? false,
        token: null,
      });
    } catch (err) {
      console.error('Google auth error:', err);
    }
  }, []);

  useEffect(() => {
    const init = () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const google = (window as any).google;
      if (!google?.accounts?.id) {
        // Google library not loaded yet, wait for it
        const interval = setInterval(() => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const google = (window as any).google;
          if (google?.accounts?.id) {
            clearInterval(interval);
            google.accounts.id.initialize({
              client_id: GOOGLE_CLIENT_ID,
              callback: handleCredentialResponse,
            });
          }
        }, 100);
        return () => clearInterval(interval);
      } else {
        google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleCredentialResponse,
        });
      }
    };
    
    // Check if Google is already available
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((window as any).google?.accounts?.id) {
      init();
    } else {
      // Wait for window load event
      window.addEventListener('load', init);
      return () => window.removeEventListener('load', init);
    }
  }, [handleCredentialResponse]);

  const signOut = useCallback(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).google?.accounts?.id?.disableAutoSelect();
    setAuth({ isSignedIn: false, userId: null, userName: null, userPicture: null, isAdmin: false, token: null });
  }, []);

  const renderButton = useCallback((container: HTMLElement) => {
    // We don't actually render the Google button anymore since we use our own
    // But we still need this function for the useEffect cleanup
  }, []);

  return (
    <AuthContext.Provider value={{ ...auth, signOut, renderButton }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuthContext must be used within AuthProvider');
  return ctx;
}
