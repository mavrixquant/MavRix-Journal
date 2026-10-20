import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
import * as authService from '@/features/auth/api';
import { setAccessToken, setUnauthorizedHandler } from '@/shared/api/client';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const startedAt = Date.now();

    if (import.meta.env.PROD) {
      // eslint-disable-next-line no-console
      console.info('[auth] bootstrap: POST /api/auth/refresh');
    }

    (async () => {
      try {
        const { user: u } = await authService.refresh();
        if (!cancelled) {
          setUser(u);
          if (import.meta.env.PROD) {
            // eslint-disable-next-line no-console
            console.info(
              `[auth] bootstrap: SUCCESS in ${Date.now() - startedAt}ms`,
              { email: u?.email, role: u?.role, verified: u?.emailVerified }
            );
          }
        }
      } catch (err) {
        if (!cancelled) {
          setAccessToken(null);
          setUser(null);
          if (import.meta.env.PROD) {
            // eslint-disable-next-line no-console
            console.warn(
              `[auth] bootstrap: FAILED in ${Date.now() - startedAt}ms`,
              err?.message || err
            );
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setAccessToken(null);
      setUser(null);
    });
  }, []);

  const signup = useCallback(async (payload) => {
    const { user: u } = await authService.signup(payload);
    setUser(u);
    return u;
  }, []);

  const login = useCallback(async (payload) => {
    const { user: u } = await authService.login(payload);
    setUser(u);
    return u;
  }, []);

  const googleLogin = useCallback(async (googleAccessToken) => {
    const { user: u } = await authService.googleLogin(googleAccessToken);
    setUser(u);
    return u;
  }, []);

  const logout = useCallback(async () => {
    await authService.logout();
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const u = await authService.fetchMe();
      setUser(u);
      return u;
    } catch {
      setUser(null);
      return null;
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, loading, signup, login, googleLogin, logout, refreshUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}